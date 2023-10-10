import { OPENAI_API_HOST, OPENAI_API_TYPE, OPENAI_API_VERSION, OPENAI_ORGANIZATION } from '@/utils/app/const';

import { OpenAIModel, OpenAIModelID, OpenAIModels } from '@/types/openai';

export const config = {
  runtime: 'edge',
};

const handler = async (req: Request): Promise<Response> => {
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
  if(true){
    response = new Response('hello', { status: 200});
    console.log("请求hello")
    return  response;
  }

  try {
    const { key } = (await req.json()) as {
      key: string;
    };

    let url = `${OPENAI_API_HOST}/v1/models`;
    if (OPENAI_API_TYPE === 'azure') {
      url = `${OPENAI_API_HOST}/openai/deployments?api-version=${OPENAI_API_VERSION}`;
    }

    const response = await fetch(url, {
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
    });

    if (response.status === 401) {
      return new Response(response.body, {
        status: 500,
        headers: response.headers,
      });
    } else if (response.status !== 200) {
      console.error(
          `OpenAI API returned an error ${
              response.status
          }: ${await response.text()}`,
      );
      throw new Error('OpenAI API returned an error');
    }

    const json = await response.json();

    const models: OpenAIModel[] = json.data
        .map((model: any) => {
          const model_name = (OPENAI_API_TYPE === 'azure') ? model.model : model.id;
          for (const [key, value] of Object.entries(OpenAIModelID)) {
            if (value === model_name) {
              return {
                id: model.id,
                name: OpenAIModels[value].name,
              };
            }
          }
        })
        .filter(Boolean);

    return new Response(JSON.stringify(models), { status: 200 });
  } catch (error) {
    console.error(error);
    return new Response('Error', { status: 500 });
  }
};

export default handler;
