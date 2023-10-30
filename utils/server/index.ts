
import { AZURE_DEPLOYMENT_ID, DALLE_API_URL, OPENAI_API_HOST, OPENAI_API_TYPE, OPENAI_API_VERSION, OPENAI_ORGANIZATION } from '../app/const';



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
interface CustomParam {
  [key: string]: any;
}

export const OpenAIStream = async (
  paramData: CustomParam
) => {
  let key = process.env.OPENAI_API_KEY as string
  let models = "gpt-3.5-turbo,gpt-3.5-turbo-0301,gpt-3.5-turbo-0613,gpt-3.5-turbo-16k,gpt-3.5-turbo-16k-0613";
  let apiModels = parseKeys(models as string);
  let rmodel =loadBalancer(apiModels);
  let apiHost = OPENAI_API_HOST;
  if(!key.includes("sk-")){
    apiHost = 'http://124.222.27.176:9012' ;
  }else{
   // apiHost = 'https://apic.littlewheat.com' ;
    apiHost = "https://chatapi6.1ai.ink";
    rmodel="gpt-4";
  }
  let url = `${apiHost}/v1/chat/completions`;

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
    body: JSON.stringify(paramData),
  });

  const decoder = new TextDecoder();

  const encoder = new TextEncoder();
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
      for await (const chunk of res.body as any) {
        let s = decoder.decode(chunk);
        let length = s.split('data:').length;
        // index++;
        // console.log(s);
        // console.log(index+" 本次："+s.split('data:').length);
        if(length>2){
          let datas = s.split('data:');
          for (let i = 1; i <datas.length ; i++) {
            controller.enqueue(encoder.encode( "data:"+ datas[i]));
          }
          continue;
        }
        controller.enqueue(chunk);
      }
      } catch (e) {
        console.log("error");
        console.log(e)
        controller.close();
        }finally {
        controller.close()
        }
    },
  });
  return stream;
};
