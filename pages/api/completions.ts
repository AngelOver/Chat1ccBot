import { OpenAIError, OpenAIStream } from '@/utils/server';

export const config = {
  runtime: 'edge',
};


const handler = async (req: Request): Promise<Response> => {
  try {
    let response = new Response('OK', { status: 200});
    response.headers.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');

    // 允许跨域访问的 HTTP 头部字段
    response.headers.set('Access-Control-Allow-Headers', '*');
    // 允许所有域名跨域访问
    response.headers.set('Access-Control-Allow-Origin', '*');
    let date = new Date();

    // 如果是 OPTIONS 请求，返回跨域响应头即可
    if (req.method === 'OPTIONS') {
      return  response;
    }


    const data = (await req.json());



    // encoding.free();
    let stream = null;
    try {
      stream = await OpenAIStream( data);
    }catch (e) {
      stream = null;
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
    response1.headers.set('Content-Type', 'text/event-stream');
    // console.log("sucKey："+rKey+"尝试"+index);
    return response1;
  } catch (error) {
    console.error(error);
    if (error instanceof OpenAIError) {
      let response2 = new Response('含有敏感词 | IP已被记录，请换个问题 | 登录即无审核，前往-> https://vip.1ai.ink?ref=noCheck', {status: 500, statusText: error.message});
      response2.headers.set('Access-Control-Allow-Methods', 'GET,POST');
      // 允许跨域访问的 HTTP 头部字段
      response2.headers.set('Access-Control-Allow-Headers', '*');
      // 允许所有域名跨域访问
      response2.headers.set('Access-Control-Allow-Origin', '*');
      return response2;
    } else {
      let response3 = new Response('请求过于频繁，等待10秒再试...', { status: 500 });

      response3.headers.set('Access-Control-Allow-Methods', 'GET,POST');
      // 允许跨域访问的 HTTP 头部字段
      response3.headers.set('Access-Control-Allow-Headers', '*');
      // 允许所有域名跨域访问
      response3.headers.set('Access-Control-Allow-Origin', '*');

      return response3;
    }
  }
};

export default handler;
