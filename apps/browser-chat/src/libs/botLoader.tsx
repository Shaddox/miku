import { BotConfig, MikuCard, mikuCardToBotConfig } from "@mikugg/bot-utils";
import React, { useCallback, useContext, useState } from "react";
import botFactory from './botFactory';
import queryString from "query-string";
import { BotConfigSettings, DEFAULT_BOT_SETTINGS, PromptCompleterEndpointType, VoiceServiceType } from "./botSettingsUtils";
import * as MikuCore from "@mikugg/core";
import * as MikuExtensions from "@mikugg/extensions";

const BOT_DIRECTORY_ENDPOINT = import.meta.env.VITE_BOT_DIRECTORY_ENDPOINT || 'http://localhost:8585/bot';
const VITE_IMAGES_DIRECTORY_ENDPOINT =
  import.meta.env.VITE_IMAGES_DIRECTORY_ENDPOINT ||
  "http://localhost:8585/image";

async function preLoadImages(imageUrls: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    let images: HTMLImageElement[] = [];
    let imagesLoaded = 0;
    for (var i = 0; i < imageUrls.length; i++) {
      images[i] = new Image();
      images[i].onload = function() {
        imagesLoaded++;
        if (imagesLoaded === imageUrls.length) resolve();
      }
      images[i].onerror = function() {
        imagesLoaded++;
        if (imagesLoaded === imageUrls.length) resolve();
      }
      images[i].src = imageUrls[i];
    }
  });
}

export function loadBotConfig(botHash: string): Promise<{
  success: boolean,
  bot?: BotConfig,
  card?: MikuCard,
  hash: string,
}> {
  return fetch(`${BOT_DIRECTORY_ENDPOINT}/${botHash}`)
    .then((res) => res.json())
    .then((card: MikuCard) => {
      const bot = mikuCardToBotConfig(card);
      return {
        success: true,
        bot,
        card,
        hash: botHash,
      };
    }).catch((err) => {
      console.warn(err);
      return {
        success: false,
        bot: undefined,
        card: undefined,
        hash: botHash,
      };
    });
}

export function getBotHashFromUrl(): string {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('bot') || '';
}

export const BotLoaderContext = React.createContext<{
  botHash: string,
  card: MikuCard | undefined,
  botConfig: BotConfig | undefined,
  botConfigSettings: BotConfigSettings,
  loading: boolean,
  error: boolean,
  setBotHash: (bot: string) => void,
  setCard: (card: MikuCard) => void,
  setBotConfig: (botConfig: BotConfig) => void,
  setBotConfigSettings: (botConfigSettings: BotConfigSettings) => void,
  setLoading: (loading: boolean) => void,
  setError: (error: boolean) => void,
}>({
  botHash: '',
  card: undefined,
  botConfig: undefined,
  botConfigSettings: DEFAULT_BOT_SETTINGS,
  loading: true,
  error: false,
  setBotHash: () => {},
  setCard: () => {},
  setBotConfig: () => {},
  setBotConfigSettings: () => {},
  setLoading: () => {},
  setError: () => {},
});

export const BotLoaderProvider = ({ children }: {children: JSX.Element}): JSX.Element => {
  const [card, setCard] = useState<MikuCard | undefined>(undefined);
  const [botHash, setBotHash] = useState<string>('');
  const [botConfig, setBotConfig] = useState<BotConfig | undefined>(undefined);
  const [botConfigSettings, setBotConfigSettings] = useState<BotConfigSettings>(DEFAULT_BOT_SETTINGS);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);

  return (
    <BotLoaderContext.Provider value={{
      card, botConfig, loading, error, botHash, botConfigSettings,
      setCard, setBotConfig, setLoading, setError, setBotHash, setBotConfigSettings
    }}>
      {children}
    </BotLoaderContext.Provider>
  );
};

export interface CustomEndpoints {
  oobabooga: string,
  openai: string,
  koboldai: string,
  azure: string,
  elevenlabs: string,
  novelai: string,
}
export interface BotData {
  hash: string
  settings: BotConfigSettings
  endpoints: CustomEndpoints
}

function getBotDataFromURL(): BotData {
  const searchParams = queryString.parse(location.search);
  return {
    hash: String(searchParams['bot'] || '') || '',
    settings: (function (): BotConfigSettings {
      try {
        const jsonString = MikuCore.Services.decode(String(searchParams['settings'] || '') || '');
        return JSON.parse(jsonString) as BotConfigSettings;
      } catch (e) {
        console.warn('Unable to load settings.')
        return DEFAULT_BOT_SETTINGS;
      }
    })(),
    endpoints: {
      oobabooga: String(searchParams['oobabooga'] || '') || '',
      openai: String(searchParams['openai'] || '') || '',
      koboldai: String(searchParams['koboldai'] || '') || '',
      azure: String(searchParams['azure'] || '') || '',
      elevenlabs: String(searchParams['elevenlabs'] || '') || '',
      novelai: String(searchParams['novelai'] || '') || '',
    }
  }
}

function setBotDataInURL(botData: BotData) {
  const { endpoints } = botData;
  const newSearchParams = {
    bot: botData.hash,
    settings: MikuCore.Services.encode(JSON.stringify(botData.settings)),
  };
  
  for (const key in endpoints) {
    if (endpoints[key]) newSearchParams[key] = endpoints[key]
  }

  const newSearchString = queryString.stringify(newSearchParams);
  window.history.replaceState({}, 'bot', `/?${newSearchString}`);
}

export function useBot(): {
  botHash: string,
  card: MikuCard | undefined,
  botConfig: BotConfig | undefined,
  botConfigSettings: BotConfigSettings,
  setBotConfigSettings: (botConfigSettings: BotConfigSettings) => void,
  loading: boolean,
  error: boolean,
  setBotHash: (botHash: string) => void,
} {
  const {
    botConfig, setBotConfig, loading, setLoading, card, setCard, error, setError, botHash, setBotHash,
    botConfigSettings, setBotConfigSettings
  } = useContext(BotLoaderContext);

  // Get data from url params

  const _botLoadCallback = useCallback((_hash: string = getBotHashFromUrl(), _botData: BotData = getBotDataFromURL()) =>{
    setLoading(true);
    setBotHash(_hash);
    const isDifferentBot = getBotHashFromUrl() !== _hash;
    const memoryLines = botFactory.getInstance()?.getMemory().getMemory() || [];
    loadBotConfig(_hash).then(async (res) => {
      if (res.success && res.bot && res.card) {
        let decoratedConfig = res.bot;

        decoratedConfig = {
          ...res.bot,
          prompt_completer: {
            service: (function (): MikuExtensions.Services.ServicesNames {
              switch (_botData.settings.promptCompleterEndpoint.type) {
                case PromptCompleterEndpointType.OPENAI:
                  return MikuExtensions.Services.ServicesNames.OpenAI
                case PromptCompleterEndpointType.KOBOLDAI:
                  return MikuExtensions.Services.ServicesNames.Pygmalion
                case PromptCompleterEndpointType.OOBABOOGA:
                default:
                  return MikuExtensions.Services.ServicesNames.Oobabooga
              }
            })(),
            props: {
              ...(function (): object {
                const settings = JSON.stringify(_botData.settings.promptCompleterEndpoint.genSettings);
                switch (_botData.settings.promptCompleterEndpoint.type) {
                  case PromptCompleterEndpointType.OPENAI:
                    return {
                      openai_key: "",
                      settings,
                      prompt: "",
                      messages: [],
                      stop: [] as string[],
                    }
                  case PromptCompleterEndpointType.KOBOLDAI:
                    return {
                      settings,
                      prompt: "",                  
                    }
                  case PromptCompleterEndpointType.OOBABOOGA:
                  default:
                    return {
                      settings,
                      prompt: "",
                      gradioEndpoint: "",                    
                    }
                }
              })()
            }
          },
          short_term_memory: {
            ...res.bot.short_term_memory,
            props: {
              ...res.bot.short_term_memory.props,
              buildStrategySlug: _botData.settings.promptStrategy
            }
          }
        }
        
        if (_botData.settings.voice.voiceService.voiceId) {
          const tts = decoratedConfig.outputListeners.find(listener => [
            MikuExtensions.Services.ServicesNames.AzureTTS,
            MikuExtensions.Services.ServicesNames.ElevenLabsTTS,
            MikuExtensions.Services.ServicesNames.NovelAITTS,
          ].includes(listener.service))

          if (tts) {
            tts.props = {
              voiceId: _botData.settings.voice.voiceService.voiceId,
              readNonSpokenText: _botData.settings.voice.readNonSpokenText,
            };
            switch (_botData.settings.voice.voiceService.type) {
              case VoiceServiceType.AZURE_TTS:
                tts.service = MikuExtensions.Services.ServicesNames.AzureTTS;
                break;
              case VoiceServiceType.ELEVENLABS_TTS:
                tts.service = MikuExtensions.Services.ServicesNames.ElevenLabsTTS;
                break;
              case VoiceServiceType.NOVELAI_TTS:
                tts.service = MikuExtensions.Services.ServicesNames.NovelAITTS;
                break;
            }
          }
        }

        // fetch first emotion and backgrounds
        const defaultEmotionGroupId = res.card?.data.extensions?.mikugg.scenarios.find(sn => sn.id === res.card?.data.extensions.mikugg.start_scenario)?.emotion_group || '';
        const defaultBackgound = res.card?.data.extensions?.mikugg.scenarios.find(sn => sn.id === res.card?.data.extensions.mikugg.start_scenario)?.background || '';
        await preLoadImages(res.card?.data.extensions?.mikugg?.backgrounds?.filter(bg => bg.id === defaultBackgound).map(
          (asset) => `${VITE_IMAGES_DIRECTORY_ENDPOINT}/${asset.source}_480p`
        ) || []);
        await preLoadImages(res.card?.data.extensions?.mikugg?.emotion_groups?.find(eg => eg.id === defaultEmotionGroupId)?.emotions?.filter((em, index) => em.id === 'happy' || index === 0).map(
          (asset) => `${VITE_IMAGES_DIRECTORY_ENDPOINT}/${asset.source}_480p`
        ) || []);
        
        setBotConfigSettings(_botData.settings);
        setBotDataInURL(_botData);

        botFactory.updateInstance(decoratedConfig, _botData.endpoints);
        if (!isDifferentBot && memoryLines.length) {
          const memory = botFactory.getInstance()?.getMemory();
          memory?.clearMemories();
          memoryLines.forEach(memoryLine => memory?.pushMemory(memoryLine));
        }
        setCard(res.card);
        setBotConfig(res.bot);
        setBotHash(res.hash);
        setError(false);
      } else {
        setError(true);
      }
      setLoading(false);
    });
  }, [setBotConfig, setError, setLoading, setBotHash]);

  const _setBotConfigSettings = useCallback((_botConfigSettings: BotConfigSettings) => {
    const newBotData = {
      ...getBotDataFromURL(),
      settings: _botConfigSettings,
    };
    _botLoadCallback(newBotData.hash, newBotData);
  }, [setBotConfigSettings, _botLoadCallback])

  return {
    card,
    botHash,
    botConfig,
    botConfigSettings,
    setBotConfigSettings: _setBotConfigSettings,
    loading,
    error,
    setBotHash: (_hash?: string) => {
      _botLoadCallback(_hash)
    },
  };
}