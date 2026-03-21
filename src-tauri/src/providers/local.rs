use std::num::NonZeroU32;

use llama_cpp_2::context::params::LlamaContextParams;
use llama_cpp_2::llama_backend::LlamaBackend;
use llama_cpp_2::llama_batch::LlamaBatch;
use llama_cpp_2::model::{AddBos, LlamaModel};
use llama_cpp_2::sampling::LlamaSampler;

use crate::error::AppError;
use crate::providers::ProviderRequest;

const N_CTX: u32 = 4096;
const MAX_NEW_TOKENS: usize = 2048;

/// Formater l'historique de conversation et le system prompt en format ChatML.
/// Plus universel que le format Phi-3 : compatible avec la plupart des modèles GGUF. (W5)
fn format_prompt(system_prompt: &Option<String>, req: &ProviderRequest) -> String {
    let mut prompt = String::new();

    if let Some(sys) = system_prompt {
        if !sys.is_empty() {
            prompt.push_str(&format!("<|im_start|>system\n{sys}<|im_end|>\n"));
        }
    }

    for msg in &req.messages {
        let role = match msg.role.as_str() {
            "assistant" => "assistant",
            _ => "user",
        };
        prompt.push_str(&format!("<|im_start|>{role}\n{}<|im_end|>\n", msg.content));
    }

    // Signaler au modèle de générer la réponse de l'assistant
    prompt.push_str("<|im_start|>assistant\n");
    prompt
}

/// Exécuter l'inférence synchrone sur un modèle GGUF local.
///
/// Appelé depuis une closure `tokio::task::spawn_blocking` dans `commands/chat.rs`
/// pour ne pas bloquer le runtime async.
///
/// Le modèle est passé en paramètre (déjà chargé et mis en cache) plutôt qu'un chemin
/// pour éviter de le recharger à chaque message. (W1)
pub fn send_blocking(
    backend: &LlamaBackend,
    model: &LlamaModel,
    req: &ProviderRequest,
    on_delta: impl Fn(String),
) -> Result<String, AppError> {
    // ── Créer le contexte d'inférence ─────────────────────────────────────────
    let ctx_params = LlamaContextParams::default()
        .with_n_ctx(NonZeroU32::new(N_CTX));
    let mut ctx = model
        .new_context(backend, ctx_params)
        .map_err(|e| AppError::Provider(format!("Erreur de contexte: {e}")))?;

    // ── Tokeniser le prompt ────────────────────────────────────────────────────
    let prompt_text = format_prompt(&req.system_prompt, req);
    let prompt_tokens = model
        .str_to_token(&prompt_text, AddBos::Always)
        .map_err(|e| AppError::Provider(format!("Erreur de tokenisation: {e}")))?;

    if prompt_tokens.is_empty() {
        return Err(AppError::Provider("Prompt vide après tokenisation.".into()));
    }

    // W6 — Vérifier que le prompt ne dépasse pas la fenêtre de contexte
    let max_new_tokens = (N_CTX as usize).saturating_sub(prompt_tokens.len());
    if max_new_tokens == 0 {
        return Err(AppError::Provider(
            "Le contexte est trop long pour ce modèle. Réduisez l'historique de conversation.".into(),
        ));
    }

    // ── Remplir le batch initial avec tous les tokens du prompt ───────────────
    let n_prompt = prompt_tokens.len();
    let mut batch = LlamaBatch::new(N_CTX as usize, 1);
    for (i, token) in prompt_tokens.iter().enumerate() {
        let is_last = i == n_prompt - 1;
        batch
            .add(*token, i as i32, &[0], is_last)
            .map_err(|e| AppError::Provider(format!("Erreur d'ajout au batch: {e}")))?;
    }

    // ── Décoder le prompt ──────────────────────────────────────────────────────
    ctx.decode(&mut batch)
        .map_err(|e| AppError::Provider(format!("Erreur de décodage du prompt: {e}")))?;

    // ── Chaîne de sampling : température → greedy ─────────────────────────────
    let mut sampler = LlamaSampler::chain_simple([
        LlamaSampler::temp(0.7),
        LlamaSampler::greedy(),
    ]);

    // ── Boucle de génération de tokens ────────────────────────────────────────
    let mut full_reply = String::new();
    let mut n_cur = n_prompt as i32;
    let mut decoder = encoding_rs::UTF_8.new_decoder();

    // W6 — Utiliser max_new_tokens pour respecter la limite de contexte
    for _ in 0..max_new_tokens.min(MAX_NEW_TOKENS) {
        // Échantillonner le prochain token depuis la dernière position décodée
        let new_token = sampler.sample(&ctx, batch.n_tokens() - 1);

        // Arrêter sur le token de fin de génération
        if model.is_eog_token(new_token) {
            break;
        }

        // Convertir le token en fragment de chaîne et le streamer
        let piece = model
            .token_to_piece(new_token, &mut decoder, false, None)
            .unwrap_or_default();

        if !piece.is_empty() {
            full_reply.push_str(&piece);
            on_delta(piece);
        }

        // Préparer le prochain batch à un seul token
        batch.clear();
        batch
            .add(new_token, n_cur, &[0], true)
            .map_err(|e| AppError::Provider(format!("Erreur d'ajout au batch: {e}")))?;
        n_cur += 1;

        ctx.decode(&mut batch)
            .map_err(|e| AppError::Provider(format!("Erreur de décodage: {e}")))?;
    }

    Ok(full_reply)
}
