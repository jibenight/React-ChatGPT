const MistralClient = require('@mistralai/mistralai');

const handleMistral = async ({ apiKey, model, messages }) => {
  const client = new MistralClient(apiKey);
  const chatResponse = await client.chat({ model, messages });
  return chatResponse.choices[0].message.content;
};

exports.handleMistral = handleMistral;
