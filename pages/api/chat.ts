import { DEFAULT_SYSTEM_PROMPT, DEFAULT_TEMPERATURE } from '@/utils/app/const';
import { OpenAIError, OpenAIStream, createImage } from '@/utils/server';

import { ChatBody, Message } from '@/types/chat';

// @ts-expect-error
import wasm from '../../node_modules/@dqbd/tiktoken/lite/tiktoken_bg.wasm?module';

import tiktokenModel from '@dqbd/tiktoken/encoders/cl100k_base.json';
import { Tiktoken, init } from '@dqbd/tiktoken/lite/init';




const handler = async (req: Request): Promise<Response> => {
  console.log('req', req);
    try {
  // 如果是 OPTIONS 请求，返回跨域响应头即可
  if (req.method === 'OPTIONS') {
    let response = new Response;
    response.headers.set('Access-Control-Allow-Methods', 'GET,POST');
    // 允许跨域访问的 HTTP 头部字段
    response.headers.set('Access-Control-Allow-Headers', '*');
    // 允许所有域名跨域访问
    response.headers.set('Access-Control-Allow-Origin', '*');
    return  response;
  }


  const { model, messages, key, prompt, temperature, generateImage } = (await req.json()) as ChatBody;

    console.log('model', model);
    
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

    const stream = await OpenAIStream(model, promptToSend, temperatureToUse, key, messagesToSend);

    return new Response(stream);
  } catch (error) {
    console.error(error);
    if (error instanceof OpenAIError) {
      return new Response('Error', { status: 500, statusText: error.message });
    } else {
      return new Response('Error', { status: 500 });
    }
  }
};

export default handler;
