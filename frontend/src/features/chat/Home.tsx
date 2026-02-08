import React, { useState } from "react";
import { Link } from "react-router-dom";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import MatrixBackground from "../../components/common/MatrixBackground";
import Login from "../auth/Login";
import Register from "../auth/Register";
import Modal from "../../components/common/Modal";

const FEATURES = [
  {
    name: "Multi-Modèles",
    description:
      "Basculez instantanément entre GPT-4, Claude 3, Gemini Pro et Mistral selon vos besoins spécifiques. Un seul compte, tous les modèles.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
  },
  {
    name: "Sécurité & Confidentialité",
    description:
      "Vos clés API sont chiffrées en base de données avec AES-256. Vos conversations restent privées, aucune donnée partagée avec des tiers.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
  },
  {
    name: "Interface Moderne",
    description:
      "Une expérience utilisateur fluide et réactive, pensée pour la productivité. Thème sombre, streaming en temps réel, markdown enrichi.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    name: "Historique & Projets",
    description:
      "Retrouvez toutes vos conversations passées, organisez-les par projet et ne perdez jamais le fil de vos idées.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    name: "Streaming en Temps Réel",
    description:
      "Les réponses s'affichent mot par mot, comme une vraie conversation. Pas d'attente, une interaction naturelle et instantanée.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    name: "Votre Clé, Votre Contrôle",
    description:
      "Utilisez vos propres clés API. Aucun intermédiaire, aucun surcoût. Vous gardez le contrôle total de vos dépenses et de vos données.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
      </svg>
    ),
  },
];

const STEPS = [
  {
    number: "01",
    title: "Créez votre compte",
    description: "Inscription rapide et gratuite. Aucune carte bancaire requise pour commencer.",
  },
  {
    number: "02",
    title: "Ajoutez vos clés API",
    description: "Connectez vos clés OpenAI, Google, Anthropic ou Mistral en toute sécurité.",
  },
  {
    number: "03",
    title: "Discutez avec l'IA",
    description: "Choisissez votre modèle préféré et commencez à converser instantanément.",
  },
];

const MODELS = [
  {
    name: "OpenAI GPT-4",
    description: "Le modèle le plus polyvalent pour la rédaction, l'analyse et le code.",
    color: "from-green-400 to-green-600",
    tag: "Populaire",
  },
  {
    name: "Anthropic Claude 3",
    description: "Excelle dans l'analyse longue, la nuance et le raisonnement structuré.",
    color: "from-orange-400 to-orange-600",
    tag: "Précis",
  },
  {
    name: "Google Gemini Pro",
    description: "Puissant en multimodal avec une compréhension contextuelle profonde.",
    color: "from-blue-400 to-blue-600",
    tag: "Multimodal",
  },
  {
    name: "Mistral",
    description: "Modèle européen rapide et performant, idéal pour le français.",
    color: "from-purple-400 to-purple-600",
    tag: "Rapide",
  },
];

const TESTIMONIALS = [
  {
    quote: "J'utilise cet outil au quotidien pour rédiger mes emails, analyser des documents et brainstormer. Le fait de pouvoir switcher entre les modèles est un vrai game-changer.",
    author: "Marie L.",
    role: "Directrice Marketing",
  },
  {
    quote: "En tant que développeur, avoir accès à GPT-4 et Claude dans la même interface me fait gagner un temps considérable. L'historique par projet est indispensable.",
    author: "Thomas R.",
    role: "Développeur Full-Stack",
  },
  {
    quote: "La sécurité des données était notre priorité. Le chiffrement des clés API et l'absence de partage de données nous ont convaincus d'adopter la plateforme.",
    author: "Sophie M.",
    role: "Responsable IT",
  },
];

const USECASES = [
  {
    title: "Rédaction & Communication",
    items: ["Emails professionnels", "Articles de blog", "Posts réseaux sociaux", "Rapports détaillés"],
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
  },
  {
    title: "Développement & Code",
    items: ["Génération de code", "Débogage assisté", "Revue de code", "Documentation technique"],
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
      </svg>
    ),
  },
  {
    title: "Analyse & Recherche",
    items: ["Synthèse de documents", "Analyse de données", "Veille concurrentielle", "Résumés exécutifs"],
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    title: "Créativité & Idéation",
    items: ["Brainstorming", "Scénarios créatifs", "Noms de marque", "Stratégies d'innovation"],
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
  },
];

function Home() {
  const [modalOpen, setModalOpen] = useState<string | null>(null);
  const isAuthenticated = !!localStorage.getItem("user");

  const ctaButton = isAuthenticated ? (
    <Link
      to="/chat"
      className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-transparent bg-teal-400 px-8 py-4 text-lg font-bold text-white shadow-lg transition duration-200 ease-in-out hover:bg-teal-500 hover:shadow-xl focus:ring focus:ring-teal-200 dark:focus:ring-teal-400/30"
    >
      Reprendre la conversation
    </Link>
  ) : (
    <button
      onClick={() => setModalOpen("register")}
      className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-transparent bg-teal-400 px-8 py-4 text-lg font-bold text-white shadow-lg transition duration-200 ease-in-out hover:bg-teal-500 hover:shadow-xl focus:ring focus:ring-teal-200 dark:focus:ring-teal-400/30"
    >
      Commencer gratuitement
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col font-sans dark:bg-slate-950 dark:text-slate-100">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-50 dark:bg-slate-950/80 dark:shadow-none dark:border-b dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex-shrink-0 flex items-center gap-2">
              <div className="h-8 w-8 bg-teal-400 rounded-full flex items-center justify-center shadow-sm">
                <span className="text-white font-bold text-sm">IA</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-800 tracking-tight dark:text-slate-100">
                ChatBot
              </h1>
            </div>
            <div className="hidden md:flex space-x-6 items-center">
              <a href="#fonctionnalites" className="text-gray-600 hover:text-teal-600 text-sm font-medium transition dark:text-slate-300 dark:hover:text-teal-300">
                Fonctionnalités
              </a>
              <a href="#modeles" className="text-gray-600 hover:text-teal-600 text-sm font-medium transition dark:text-slate-300 dark:hover:text-teal-300">
                Modèles
              </a>
              <a href="#cas-usage" className="text-gray-600 hover:text-teal-600 text-sm font-medium transition dark:text-slate-300 dark:hover:text-teal-300">
                Cas d'usage
              </a>
              <a href="#temoignages" className="text-gray-600 hover:text-teal-600 text-sm font-medium transition dark:text-slate-300 dark:hover:text-teal-300">
                Témoignages
              </a>
              <Link to="/guide" className="text-gray-600 hover:text-teal-600 text-sm font-medium transition dark:text-slate-300 dark:hover:text-teal-300">
                Guide
              </Link>
            </div>
            <div className="flex space-x-3 items-center">
              {isAuthenticated ? (
                <Link
                  to="/chat"
                  className="bg-teal-400 hover:bg-teal-500 text-white px-5 py-2 rounded-xl text-sm font-semibold shadow-md transition duration-200 ease-in-out transform hover:scale-105 focus:ring focus:ring-teal-200"
                >
                  Accéder au Chat
                </Link>
              ) : (
                <>
                  <button
                    onClick={() => setModalOpen("login")}
                    className="text-gray-600 hover:text-teal-600 px-3 py-2 rounded-md text-sm font-medium transition duration-200 bg-transparent border-none cursor-pointer dark:text-slate-300 dark:hover:text-teal-300"
                  >
                    Connexion
                  </button>
                  <button
                    onClick={() => setModalOpen("register")}
                    className="bg-teal-400 hover:bg-teal-500 text-white px-5 py-2 rounded-xl text-sm font-semibold shadow-md transition duration-200 ease-in-out transform hover:scale-105 focus:ring focus:ring-teal-200 border-none cursor-pointer dark:focus:ring-teal-400/30"
                  >
                    Inscription
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-hidden bg-gradient-to-b from-gray-50 to-white dark:from-slate-950 dark:to-slate-900">
        <MatrixBackground />
        <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col items-center justify-center px-4 py-4 text-center sm:px-6 lg:px-8">
          <div className="mx-auto h-80 w-80 md:h-96 md:w-96">
            <DotLottieReact
              src="/robot.lottie"
              loop
              autoplay
              className="h-full w-full"
            />
          </div>
          <h2 className="-mt-20 mb-6 text-5xl font-extrabold tracking-tight text-gray-900 dark:text-slate-100 sm:text-6xl md:text-7xl">
            <span className="block">Discutez avec</span>
            <span className="p-2 block text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-teal-600">
              l'intelligence artificielle
            </span>
          </h2>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-gray-500 sm:text-lg md:mt-5 md:text-xl dark:text-slate-300">
            Accédez aux modèles d'IA les plus performants (OpenAI, Gemini,
            Claude, Mistral) via une interface unique, sécurisée et conviviale.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            {ctaButton}
            <a
              href="#fonctionnalites"
              className="inline-flex items-center gap-2 rounded-xl border-2 border-teal-400 px-8 py-4 text-lg font-bold text-teal-600 transition duration-200 hover:bg-teal-50 dark:text-teal-300 dark:hover:bg-teal-400/10"
            >
              Découvrir
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </a>
          </div>
        </div>
      </div>

      {/* Stats / Social Proof Bar */}
      <div className="bg-teal-500 dark:bg-teal-600">
        <div className="max-w-7xl mx-auto px-4 py-10 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center text-white">
            {[
              { value: "4", label: "Modèles d'IA intégrés" },
              { value: "100%", label: "Open source & transparent" },
              { value: "AES-256", label: "Chiffrement des clés" },
              { value: "0 €", label: "Aucun surcoût plateforme" },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-3xl sm:text-4xl font-extrabold">{stat.value}</p>
                <p className="mt-1 text-sm sm:text-base font-medium text-teal-100">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div id="fonctionnalites" className="bg-white py-24 border-t border-gray-100 dark:bg-slate-950 dark:border-slate-800 scroll-mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:text-center mb-16">
            <p className="text-base text-teal-600 font-semibold tracking-wide uppercase dark:text-teal-300">
              Fonctionnalités
            </p>
            <h3 className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl dark:text-slate-100">
              Tout ce dont vous avez besoin, rien de superflu
            </h3>
            <p className="mt-4 max-w-2xl text-xl text-gray-500 lg:mx-auto dark:text-slate-300">
              Une plateforme pensée pour les professionnels qui veulent tirer le meilleur de l'IA.
            </p>
          </div>

          <div className="mt-10">
            <dl className="space-y-10 md:space-y-0 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-x-12 md:gap-y-16">
              {FEATURES.map((feature) => (
                <div key={feature.name} className="relative group">
                  <dt>
                    <div className="absolute flex items-center justify-center h-12 w-12 rounded-xl bg-teal-400 text-white shadow-lg transition-transform duration-200 group-hover:scale-110">
                      {feature.icon}
                    </div>
                    <p className="ml-16 text-xl leading-6 font-bold text-gray-900 dark:text-slate-100">
                      {feature.name}
                    </p>
                  </dt>
                  <dd className="mt-2 ml-16 text-base text-gray-500 leading-relaxed dark:text-slate-300">
                    {feature.description}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>

      {/* How it Works */}
      <div className="bg-gray-50 py-24 dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:text-center mb-16">
            <p className="text-base text-teal-600 font-semibold tracking-wide uppercase dark:text-teal-300">
              Simple & Rapide
            </p>
            <h3 className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl dark:text-slate-100">
              Prêt en 3 étapes
            </h3>
          </div>
          <div className="grid md:grid-cols-3 gap-12">
            {STEPS.map((step) => (
              <div
                key={step.number}
                className="relative bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-lg border border-gray-100 dark:border-slate-700 hover:shadow-xl transition-shadow duration-300"
              >
                <span className="text-6xl font-black text-teal-400/20 absolute top-4 right-6 dark:text-teal-400/10">
                  {step.number}
                </span>
                <div className="h-12 w-12 rounded-xl bg-teal-400/10 flex items-center justify-center mb-6">
                  <span className="text-teal-600 font-extrabold text-xl dark:text-teal-300">{step.number}</span>
                </div>
                <h4 className="text-xl font-bold text-gray-900 mb-3 dark:text-slate-100">{step.title}</h4>
                <p className="text-gray-500 leading-relaxed dark:text-slate-300">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI Models Showcase */}
      <div id="modeles" className="bg-white py-24 dark:bg-slate-950 scroll-mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:text-center mb-16">
            <p className="text-base text-teal-600 font-semibold tracking-wide uppercase dark:text-teal-300">
              Modèles
            </p>
            <h3 className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl dark:text-slate-100">
              Les meilleurs modèles d'IA, une seule interface
            </h3>
            <p className="mt-4 max-w-2xl text-xl text-gray-500 lg:mx-auto dark:text-slate-300">
              Comparez et choisissez le modèle adapté à chaque situation.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {MODELS.map((model) => (
              <div
                key={model.name}
                className="group relative rounded-2xl bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
              >
                <div className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold text-white bg-gradient-to-r ${model.color} mb-4`}>
                  {model.tag}
                </div>
                <h4 className="text-lg font-bold text-gray-900 mb-2 dark:text-slate-100">{model.name}</h4>
                <p className="text-sm text-gray-500 leading-relaxed dark:text-slate-300">{model.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Use Cases */}
      <div id="cas-usage" className="bg-gray-50 py-24 dark:bg-slate-900 scroll-mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:text-center mb-16">
            <p className="text-base text-teal-600 font-semibold tracking-wide uppercase dark:text-teal-300">
              Cas d'usage
            </p>
            <h3 className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl dark:text-slate-100">
              Adapté à tous vos besoins professionnels
            </h3>
            <p className="mt-4 max-w-2xl text-xl text-gray-500 lg:mx-auto dark:text-slate-300">
              Quelle que soit votre activité, l'IA vous accompagne au quotidien.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {USECASES.map((usecase) => (
              <div
                key={usecase.title}
                className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-md border border-gray-100 dark:border-slate-700 hover:shadow-lg transition-shadow duration-300"
              >
                <div className="h-14 w-14 rounded-xl bg-teal-400/10 flex items-center justify-center text-teal-500 mb-5 dark:text-teal-300">
                  {usecase.icon}
                </div>
                <h4 className="text-lg font-bold text-gray-900 mb-3 dark:text-slate-100">{usecase.title}</h4>
                <ul className="space-y-2">
                  {usecase.items.map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm text-gray-500 dark:text-slate-300">
                      <svg className="h-4 w-4 text-teal-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Testimonials */}
      <div id="temoignages" className="bg-white py-24 dark:bg-slate-950 scroll-mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:text-center mb-16">
            <p className="text-base text-teal-600 font-semibold tracking-wide uppercase dark:text-teal-300">
              Témoignages
            </p>
            <h3 className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl dark:text-slate-100">
              Ils utilisent notre plateforme au quotidien
            </h3>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {TESTIMONIALS.map((testimonial) => (
              <div
                key={testimonial.author}
                className="bg-gray-50 dark:bg-slate-800 rounded-2xl p-8 border border-gray-100 dark:border-slate-700 hover:shadow-lg transition-shadow duration-300"
              >
                <svg className="h-8 w-8 text-teal-400 mb-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                </svg>
                <p className="text-gray-600 dark:text-slate-300 leading-relaxed mb-6 italic">
                  "{testimonial.quote}"
                </p>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white font-bold text-sm">
                    {testimonial.author.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-slate-100">{testimonial.author}</p>
                    <p className="text-sm text-gray-500 dark:text-slate-400">{testimonial.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Comparison / Why Us */}
      <div className="bg-gray-50 py-24 dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:text-center mb-16">
            <p className="text-base text-teal-600 font-semibold tracking-wide uppercase dark:text-teal-300">
              Pourquoi nous choisir
            </p>
            <h3 className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl dark:text-slate-100">
              L'alternative intelligente aux abonnements coûteux
            </h3>
          </div>
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              {[
                { title: "Pas d'abonnement mensuel", text: "Utilisez vos propres clés API et ne payez que ce que vous consommez réellement." },
                { title: "Tous les modèles réunis", text: "Plus besoin de jongler entre ChatGPT, Claude et Gemini. Tout est centralisé." },
                { title: "Vos données vous appartiennent", text: "Aucune collecte, aucun partage. Votre historique reste sur nos serveurs sécurisés." },
                { title: "Code source ouvert", text: "Transparence totale. Inspectez, modifiez et déployez comme vous le souhaitez." },
              ].map((item) => (
                <div key={item.title} className="flex gap-4">
                  <div className="flex-shrink-0 mt-1">
                    <div className="h-6 w-6 rounded-full bg-teal-400 flex items-center justify-center">
                      <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-slate-100">{item.title}</h4>
                    <p className="mt-1 text-gray-500 dark:text-slate-300">{item.text}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-xl border border-gray-100 dark:border-slate-700">
              <div className="text-center">
                <p className="text-sm font-semibold text-teal-600 uppercase tracking-wide dark:text-teal-300">Notre promesse</p>
                <p className="mt-4 text-5xl font-extrabold text-gray-900 dark:text-slate-100">0 €</p>
                <p className="mt-2 text-gray-500 dark:text-slate-300">pour la plateforme</p>
                <ul className="mt-8 space-y-4 text-left">
                  {["Accès à tous les modèles", "Historique illimité", "Chiffrement AES-256", "Organisation par projets", "Streaming temps réel", "Thème sombre"].map((item) => (
                    <li key={item} className="flex items-center gap-3 text-gray-700 dark:text-slate-200">
                      <svg className="h-5 w-5 text-teal-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                      {item}
                    </li>
                  ))}
                </ul>
                <div className="mt-8">
                  {ctaButton}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Final CTA */}
      <div className="relative overflow-hidden bg-gradient-to-r from-teal-500 to-teal-600 py-20">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 25% 50%, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        </div>
        <div className="relative max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h3 className="text-3xl sm:text-4xl font-extrabold text-white mb-6">
            Prêt à transformer votre façon de travailler avec l'IA ?
          </h3>
          <p className="text-xl text-teal-100 mb-10 max-w-2xl mx-auto">
            Rejoignez les utilisateurs qui ont déjà adopté la plateforme multi-modèles la plus flexible du marché.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {isAuthenticated ? (
              <Link
                to="/chat"
                className="inline-flex items-center justify-center rounded-xl bg-white px-8 py-4 text-lg font-bold text-teal-600 shadow-lg transition duration-200 hover:bg-gray-50 hover:shadow-xl"
              >
                Accéder au Chat
              </Link>
            ) : (
              <>
                <button
                  onClick={() => setModalOpen("register")}
                  className="inline-flex cursor-pointer items-center justify-center rounded-xl bg-white px-8 py-4 text-lg font-bold text-teal-600 shadow-lg transition duration-200 hover:bg-gray-50 hover:shadow-xl border-none"
                >
                  Créer un compte gratuit
                </button>
                <button
                  onClick={() => setModalOpen("login")}
                  className="inline-flex cursor-pointer items-center justify-center rounded-xl border-2 border-white px-8 py-4 text-lg font-bold text-white transition duration-200 hover:bg-white/10 bg-transparent"
                >
                  Se connecter
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="h-6 w-6 bg-teal-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">IA</span>
                </div>
                <span className="text-lg font-semibold">ChatBot</span>
              </div>
              <p className="text-sm text-gray-400 leading-relaxed">
                La plateforme multi-modèles qui centralise les meilleurs outils d'intelligence artificielle en une interface unique et sécurisée.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-gray-200">Plateforme</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#fonctionnalites" className="hover:text-teal-400 transition">Fonctionnalités</a></li>
                <li><a href="#modeles" className="hover:text-teal-400 transition">Modèles d'IA</a></li>
                <li><a href="#cas-usage" className="hover:text-teal-400 transition">Cas d'usage</a></li>
                <li><Link to="/guide" className="hover:text-teal-400 transition">Guide d'utilisation</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-gray-200">Sécurité</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>Chiffrement AES-256</li>
                <li>Aucun partage de données</li>
                <li>Code source ouvert</li>
                <li>Hébergement sécurisé</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-center text-sm text-gray-400">
              &copy; {new Date().getFullYear()} Projet ChatBot IA. Tous droits réservés.
            </p>
          </div>
        </div>
      </footer>

      {/* Modal Central */}
      <Modal isOpen={!!modalOpen} onClose={() => setModalOpen(null)}>
        {modalOpen === "login" && <Login isModal={true} />}
        {modalOpen === "register" && (
          <Register
            isModal={true}
            onSwitchToLogin={() => setModalOpen("login")}
          />
        )}
      </Modal>
    </div>
  );
}

export default Home;
