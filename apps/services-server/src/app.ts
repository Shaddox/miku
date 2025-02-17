/* eslint-disable @typescript-eslint/no-var-requires */
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import multer from 'multer';
import * as MikuExtensions from '@mikugg/extensions';

// Load environment variables
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env')});

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || '';
const AZURE_API_KEY = process.env.AZURE_API_KEY || '';
const NOVELAI_API_KEY = process.env.NOVELAI_API_KEY || '';
const PYGMALION_ENDPOINT = process.env.PYGMALION_ENDPOINT || '';
const OOBABOOGA_ENDPOINT = process.env.OOBABOOGA_ENDPOINT || '';
const EMOTIONS_ENDPOINT = process.env.EMOTIONS_ENDPOINT || '';
const SBERT_EMOTIONS_ENABLED = Number(process.env.SBERT_EMOTIONS_ENABLED || '0');
const SBERT_SIMILARITY_API_URL = process.env.SBERT_SIMILARITY_API_URL || '';
const SBERT_SIMILARITY_API_TOKEN = '';
const AUDIO_FILE_PATH = '_temp';

const app = express();
app.use(cors());
app.use(bodyParser.json());
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, `${AUDIO_FILE_PATH}/`)
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '.wav')
  }
})
const uploadAudio = multer({ storage });
app.post('/audio-upload', uploadAudio.single('file'), (req, res) => {
  res.status(200).send(req.file?.filename || '');
});

const addRoute = (path: string, cb: (body: any) => Promise<{ status: number, response: any}>) => {
  app.post(path, async (req, res) => {
    const result = await cb(req.body);
    res.status(result.status).send(result.response);
  });
};

if (OPENAI_API_KEY) {
  new MikuExtensions.Services.OpenAIPromptCompleterService({
    apiKey: OPENAI_API_KEY,
    serviceId: MikuExtensions.Services.ServicesNames.OpenAI,
    billingEndpoint: '',
    addRoute
  });  
}

if (ELEVENLABS_API_KEY) {
  new MikuExtensions.Services.TTS.ElevenLabsService({
    apiKey: ELEVENLABS_API_KEY,
    costPerRequest: 50,
    serviceId: MikuExtensions.Services.ServicesNames.ElevenLabsTTS,
    billingEndpoint: '',
    addRoute
  });  
}
if (AZURE_API_KEY) {
  new MikuExtensions.Services.TTS.AzureTTSService({
    apiKey: AZURE_API_KEY,
    costPerRequest: 10,
    serviceId: MikuExtensions.Services.ServicesNames.AzureTTS,
    billingEndpoint: '',
    addRoute
  });  
}

if (NOVELAI_API_KEY) {
  new MikuExtensions.Services.TTS.NovelAITTSService({
    apiKey: NOVELAI_API_KEY,
    costPerRequest: 10, 
    billingEndpoint: '',
    serviceId: MikuExtensions.Services.ServicesNames.NovelAITTS,
    addRoute
  });
}

if (PYGMALION_ENDPOINT) {
  new MikuExtensions.Services.PygmalionService({
    koboldEndpoint: PYGMALION_ENDPOINT,
    serviceId: MikuExtensions.Services.ServicesNames.Pygmalion,
    billingEndpoint: '',
    addRoute
  });
}

if (OOBABOOGA_ENDPOINT) {
  new MikuExtensions.Services.OobaboogaService({
    gradioEndpoint: OOBABOOGA_ENDPOINT,
    serviceId: MikuExtensions.Services.ServicesNames.Oobabooga,
    billingEndpoint: '',
    addRoute
  });  
}

if (EMOTIONS_ENDPOINT && OPENAI_API_KEY) {
  new MikuExtensions.Services.OpenAIEmotionInterpreter({
    apiKey: OPENAI_API_KEY,
    emotionConfigsEndpoint: EMOTIONS_ENDPOINT, 
    defaultConfigHash: 'QmWLtYCXoDXEjw2nuXfkoXv9T7J8umcnF6CyyRjtFuW1UE',
    serviceId: MikuExtensions.Services.ServicesNames.OpenAIEmotionInterpreter,
    billingEndpoint: '',
    addRoute
  });  
}

if (OPENAI_API_KEY) {
  new MikuExtensions.Services.WhisperService({
    apiKey: OPENAI_API_KEY,
    serviceId: MikuExtensions.Services.ServicesNames.WhisperSTT,
    audioFilePath: AUDIO_FILE_PATH,
    billingEndpoint: '',
    costPerRequest: 0,
    addRoute
  });
}

if (SBERT_EMOTIONS_ENABLED) {
  new MikuExtensions.Services.SBertEmotionInterpreterService({
    serviceId: MikuExtensions.Services.ServicesNames.SBertEmotionInterpreter,
    billingEndpoint: '',
    sbertSimilarityAPIToken: SBERT_SIMILARITY_API_TOKEN,
    sbertSimilarityAPIUrl: SBERT_SIMILARITY_API_URL,
    addRoute
  });
}

export default app;