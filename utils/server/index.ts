import { Message } from '@/types/chat';
import { OpenAIModel } from '@/types/openai';

import { AZURE_DEPLOYMENT_ID, DALLE_API_URL, OPENAI_API_HOST, OPENAI_API_TYPE, OPENAI_API_VERSION, OPENAI_ORGANIZATION } from '../app/const';

import {
  ParsedEvent,
  ReconnectInterval,
  createParser,
} from 'eventsource-parser';

export class OpenAIError extends Error {
  type: string;
  param: string;
  code: string;

  constructor(message: string, type: string, param: string, code: string) {
    super(message);
    this.name = 'OpenAIError';
    this.type = type;
    this.param = param;
    this.code = code;
  }
}

export const createImage = async (prompt: string, key?: string): Promise<{ data: Array<{ url: string }> }> => {
  const apiKey = key ? key : process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error('API key is not set.');
  }

  const response = await fetch(DALLE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      prompt,
      num_images: 1,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`DALL-E API error: ${errorData.message || response.statusText}`);
  }

  const responseData = await response.json();
  return responseData;
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


export const OpenAIStream = async (
  model: OpenAIModel,
  systemPrompt: string,
  temperature : number,
  key: string,
  messages: Message[]
) => {

  let models = "gpt-3.5-turbo,gpt-3.5-turbo-0301,gpt-3.5-turbo-0613";
  let apiModels = parseKeys(models as string);
  let rmodel =loadBalancer(apiModels);
  let apiHost = OPENAI_API_HOST;
  if(!key.includes("sk-")){
    apiHost = 'http://124.222.27.176:9012' ;
  }else{
    apiHost = 'https://apic3.a1r.cc' ;
  }
  let url = `${apiHost}/v1/chat/completions`;
  if (OPENAI_API_TYPE === 'azure') {
    url = `${apiHost}/openai/deployments/${AZURE_DEPLOYMENT_ID}/chat/completions?api-version=${OPENAI_API_VERSION}`;
  }
  // if(!key.includes("sk-")){
  //   console.log(apiHost+"："+key+":url"+url);
  // }

  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(OPENAI_API_TYPE === 'openai' && {
        Authorization: `Bearer ${key ? key : process.env.OPENAI_API_KEY}`
      }),
      ...(OPENAI_API_TYPE === 'azure' && {
        'api-key': `${key ? key : process.env.OPENAI_API_KEY}`
      }),
      ...((OPENAI_API_TYPE === 'openai' && OPENAI_ORGANIZATION) && {
        'OpenAI-Organization': OPENAI_ORGANIZATION,
      }),
    },
    method: 'POST',
    body: JSON.stringify({
      ...(OPENAI_API_TYPE === 'openai' && {model: rmodel}),
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        ...messages,
      ],
      max_tokens: 1000,
      temperature: temperature,
      stream: true,
    }),
  });

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  if (res.status !== 200) {
    const result = await res.json();
    if (result.error) {
      throw new OpenAIError(
        result.error.message,
        result.error.type,
        result.error.param,
        result.error.code,
      );
    } else {
      throw new Error(
        `OpenAI API returned an error: ${
          decoder.decode(result?.value) || result.statusText
        }`,
      );
    }
  }

  const stream = new ReadableStream({
    async start(controller) {

      try {
      const onParse = (event: ParsedEvent | ReconnectInterval) => {
        if (event.type === 'event') {
          const data = event.data;

          
          try {

            if(data.includes("[DONE]")){
                controller.close();
                return;
            }
            const json = JSON.parse(data);
            const text = json.choices[0].delta.content;
            const queue = encoder.encode(text);
            controller.enqueue(queue);
          } catch (e) {
            controller.error(e);
          }
        }
      };

      const parser = createParser(onParse);

      for await (const chunk of res.body as any) {
        parser.feed(decoder.decode(chunk));
      }

      } catch (e) {
        //console.log("error");
        console.log(e)
        controller.close();
      }finally {
        controller.close()
      }



    },
  });

  return stream;
};
