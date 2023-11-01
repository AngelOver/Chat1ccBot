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

    let data = (await req.json());
    console.log(data);
    console.log(data.messages.length);
    let length = data.messages.length;
    let msg = [];
    if( data.messages[0].role == 'system' ){
      data.messages[0].content = 'You are ChatGPT, a large language model trained by OpenAI.Knowledge cutoff: 2021-09,Current model: gpt-4'+data.messages[0].content;
    }
     if( data.messages[length-1].content.length>2000){
       console.log("超过2000字");
       let msg2 = []
       msg2.push(data.messages[length-1]);
       data.messages= msg2;
     }
    if (length > 3) {
      const lastThreeMessages = data.messages.slice(length - 3, length);
      // 保留第一条消息并与最后三条合并
      data.messages = [data.messages[0], ...lastThreeMessages];
    } else {
      data.messages = data.messages;
    }
    console.log(data.messages);
    let totalLength = 0;
    for (let i = 0; i < data.messages.length; i++) {
      totalLength += data.messages[i].content.length;
    }
    if(totalLength>3500){
        console.log("超过3500字");
        let msg2 = []
      msg2.push(data.messages[length-1]);
      data.messages= msg2;
    }
    console.log('数据改造');
    console.log(data.messages);
    //如果 data.messages[0].role == 'role' 则不用审核

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
