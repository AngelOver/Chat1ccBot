import { DEFAULT_SYSTEM_PROMPT, DEFAULT_TEMPERATURE } from '@/utils/app/const';
import { OpenAIError, OpenAIStream, createImage } from '@/utils/server';

import { ChatBody, Message } from '@/types/chat';

// @ts-expect-error
import wasm from '../../node_modules/@dqbd/tiktoken/lite/tiktoken_bg.wasm?module';

import tiktokenModel from '@dqbd/tiktoken/encoders/cl100k_base.json';
import { Tiktoken, init } from '@dqbd/tiktoken/lite/init';


const keywords = ["带货达人", "发掘师", "科学上网", "梯子", "天安门", "动摇", "镰刀", "foundations", "习近平", "毛泽东", "周恩来", "主席", "毛泽东", "擦边", "做爱", "精子", "PING", "周恩来", "你需要扮演一", "精液"];


export const config = {
  runtime: 'edge',
};


function parseKeys(keys: string) {
  return keys
      ? keys
          .split(/\s*[,\n]\s*/)
      : []
}
function loadBalancer<T>(arr: T[], strategy = 'random') {
   return  arr[Math.floor(Math.random() * arr.length)]
}

const handler = async (req: Request): Promise<Response> => {
  try {
    console.log("请求来了")
    let response = new Response('OK', { status: 200});
    response.headers.set('Access-Control-Allow-Methods', 'GET,POST');
    // 允许跨域访问的 HTTP 头部字段
    response.headers.set('Access-Control-Allow-Headers', '*');
    // 允许所有域名跨域访问
    response.headers.set('Access-Control-Allow-Origin', '*');

    // 如果是 OPTIONS 请求，返回跨域响应头即可
    if (req.method === 'OPTIONS') {
      console.log("请求OPTIONS")
      return  response;
    }



    const { model, messages, key, prompt, temperature, generateImage } = (await req.json()) as ChatBody;

    const msg = messages[messages.length - 1].content;
    console.log(msg)
    if (keywords.includes(msg)) {
      throw new OpenAIError("","", "", "");
    }

    await init((imports) => WebAssembly.instantiate(wasm, imports));
    const encoding = new Tiktoken(
      tiktokenModel.bpe_ranks,
      tiktokenModel.special_tokens,
      tiktokenModel.pat_str,
    );

    let promptToSend = prompt;
    if (!promptToSend) {
      promptToSend = DEFAULT_SYSTEM_PROMPT;
    }

    let temperatureToUse = temperature;
    if (temperatureToUse == null) {
      temperatureToUse = DEFAULT_TEMPERATURE;
    }

    console.log('generateImage', generateImage);

    // Fetch the image URL when the imagePrompt field is provided
    let imageUrl: string | null = null;
    if (generateImage) {
      const imagePrompt = messages[messages.length - 1].content;

      const data = await createImage(imagePrompt, key);
      console.log('data', data);
      imageUrl = data.data[0].url;

      console.log('imageUrl', imageUrl);
      console.log('messages', messages);

      return new Response(imageUrl);
    }



    const prompt_tokens = encoding.encode(promptToSend);

    let tokenCount = prompt_tokens.length;
    let messagesToSend: Message[] = [];

    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      const tokens = encoding.encode(message.content);

      if (tokenCount + tokens.length + 1000 > model.tokenLimit) {
        break;
      }
      tokenCount += tokens.length;
      messagesToSend = [message, ...messagesToSend];
    }

    encoding.free();
     let stream = null;
    // stream = await OpenAIStream(model, promptToSend, temperatureToUse, key, messagesToSend);
     let maxRetry = 20;
    let index = 0;
    let retryCount = 0;
    let errorapikeys = {};
    let availableKeys = {};
    let apikeys = parseKeys(process.env.OPENAI_API_KEY);
    let rKey = '';
    maxRetry = apikeys.length
    if(maxRetry>20){
        maxRetry = 20;
    }
    console.log("总"+maxRetry+"开始请求"+index+key);
    while (!stream &&maxRetry>0&& retryCount++ < maxRetry) {
        index++
        rKey =loadBalancer(apikeys);
        console.log("总"+maxRetry+"开始尝试"+index+rKey);
        try {
            stream = await OpenAIStream(model, promptToSend, temperatureToUse, rKey, messagesToSend);
        }catch (e) {
            stream = null;
            console.log(e);
            if(maxRetry==retryCount){
                throw new Error(
                    `OpenAI API returned an error: 请稍候再试`,
                );
            }
        }
    }
    if(!stream){
      throw new Error(
          `OpenAI API returned an error: 请稍候再试`,
      );
    }

    let response1 = new Response(stream);
    response1.headers.set('Access-Control-Allow-Methods', 'GET,POST');
    // 允许跨域访问的 HTTP 头部字段
    response1.headers.set('Access-Control-Allow-Headers', '*');
    // 允许所有域名跨域访问
    response1.headers.set('Access-Control-Allow-Origin', '*');
    return response1;
  } catch (error) {
    console.error(error);
    if (error instanceof OpenAIError) {
      return new Response('含有敏感词 | Contains sensitive words', { status: 500, statusText: error.message });
    } else {
      return new Response('请求过于频繁，等待10秒再试...', { status: 500 });
    }
  }
};

export default handler;
