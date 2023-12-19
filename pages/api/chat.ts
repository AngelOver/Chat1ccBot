import { DEFAULT_SYSTEM_PROMPT, DEFAULT_TEMPERATURE } from '@/utils/app/const';
import { OpenAIError, OpenAIStream } from '@/utils/server';

import { ChatBody, Message } from '@/types/chat';

import {MGC} from '@/types/mgc';

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
    let response = new Response('OK', { status: 200});
    response.headers.set('Access-Control-Allow-Methods', 'GET,POST');
    // 允许跨域访问的 HTTP 头部字段
    response.headers.set('Access-Control-Allow-Headers', '*');
    // 允许所有域名跨域访问
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Origin', '*');
    let date = new Date();
    let hour1 = date.getHours()+8;
    hour1 =  hour1>=24?hour1-24:hour1;
    let minutes1 = hour1*3+date.getMinutes()*7;
    let minutes2 = hour1*3+(date.getMinutes()-1)*7;
    let minutes23 = hour1*3+(date.getMinutes()+1)*7;
    let minutes3 = hour1*2+date.getMinutes()*8;
    let minutes4 = hour1*2+(date.getMinutes()-1)*8;
    let minutes5 = hour1*2+(date.getMinutes()+1)*8;


    if(!(req.url.includes(String(minutes3))||req.url.includes(String(minutes4))||req.url.includes(String(minutes5)))){
      console.log("鉴权异常："+req.url);
      console.log(hour1+":"+date.getMinutes()+":"+minutes1+":"+minutes2+":"+minutes3+":"+minutes4);
        return   new Response('error', { status: 404});;
    }

    // 如果是 OPTIONS 请求，返回跨域响应头即可
    if (req.method === 'OPTIONS') {
      return  response;
    }

    let sign =Number( req.headers.get('Authorization')) ;
    if(!(sign==minutes1||sign==minutes2||sign==minutes23)){
      return   new Response('error', { status: 404});;
    }

    const { model, messages, key, prompt, temperature, generateImage } = (await req.json()) as ChatBody;

    const msg = messages[messages.length - 1].content;
    //console.log(msg)
    if (MGC.keywordsChat1.test(msg)||MGC.keywordsChat2.test(msg)
        ||MGC.keywordsChat3.test(msg)
         ||MGC.keywordsChat5.test(msg)
         ||MGC.keywordsChat6.test(msg)
        ||MGC.keywordsChat7.test(msg)
         ||MGC.keywordsChat8.test(msg)
        // ||keywordsChat9.test(msg)
    ) {
      console.log("敏感词msg："+msg)
      throw new OpenAIError("含有敏感词 | IP已被记录，请换个问题 | 登录即无审核，前往-> https://vip.1ai.ink?ref=noCheck  ","", "", "");
    }

    // await init((imports) => WebAssembly.instantiate(wasm, imports));
    // const encoding = new Tiktoken(
    //   tiktokenModel.bpe_ranks,
    //   tiktokenModel.special_tokens,
    //   tiktokenModel.pat_str,
    // );

    let promptToSend = prompt;
    if (!promptToSend) {
      promptToSend = DEFAULT_SYSTEM_PROMPT;
    }

    let temperatureToUse = temperature;
    if (temperatureToUse == null) {
      temperatureToUse = DEFAULT_TEMPERATURE;
    }
    let apikeys = parseKeys(process.env.OPENAI_API_KEY as string);
    // Fetch the image URL when the imagePrompt field is provided
    let imageUrl: string | null = null;
    if (generateImage) {
      // const imagePrompt = messages[messages.length - 1].content;
      // console.log('generateImage', generateImage);
      // const data = await createImage(imagePrompt, loadBalancer(apikeys));
      // console.log('data', data);
      // imageUrl = data.data[0].url;
      //
      // console.log('imageUrl', imageUrl);
      // console.log('messages', messages);
      let imgMsg="绘画功能已升级为 MidJourney专业绘画，前往 https://vip.1ai.ink/midjourney "
      // let imgMsg= "" +
      //     "图片生成成功，正在加载图片链接中，请耐心等候10秒左右。。。。。(快慢取决于你自己的网络)\n" +
      //     "注：AI绘画由OpenAI提供，模型为 DALL-E2，效果有待完善，以下是图片\n"+
      //     "建议关键词写丰富点，例如：画少女，眼影，光影，校园，质量最好，甜美，樱花，薰衣草色眼镜，黑色长发。\n"+
      //     "专业绘画见Midjourney绘画，前往 https://mj.a1r.cc\n";
      // imgMsg += "<img src='" + data.data[0].url + "'></td>";

      let response4 = new Response(imgMsg);
      response4.headers.set('Access-Control-Allow-Methods', 'GET,POST');
      // 允许跨域访问的 HTTP 头部字段
      response4.headers.set('Access-Control-Allow-Headers', '*');
      // 允许所有域名跨域访问
      response4.headers.set('Access-Control-Allow-Origin', '*');
      return  response4;
    }


    // const prompt_tokens = encoding.encode(promptToSend);

    // let tokenCount = prompt_tokens.length;
    let messagesToSend: Message[] = [];

    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      // const tokens = encoding.encode(message.content);

      // if (tokenCount + tokens.length + 1000 > model.tokenLimit) {
      //   break;
      // }
      // tokenCount += tokens.length;
      messagesToSend = [message, ...messagesToSend];
    }

    // encoding.free();
     let stream = null;
    // stream = await OpenAIStream(model, promptToSend, temperatureToUse, key, messagesToSend);
     let maxRetry = 3;
    let index = 0;
    let retryCount = 0;
    let errorapikeys = {};
    let availableKeys = {};

    let rKey = '';
    maxRetry = apikeys.length
    if(maxRetry>2){
        maxRetry = 2;
    }
    //console.log("总"+maxRetry+"开始请求"+index+key);
    while (!stream &&maxRetry>0&& retryCount++ < maxRetry) {
        index++
        rKey =loadBalancer(apikeys);
        if(index>1){
          console.log("总"+maxRetry+"尝试"+index+rKey+msg);
        }
        try {
            stream = await OpenAIStream(model, promptToSend, temperatureToUse, rKey, messagesToSend);
        }catch (e) {
            stream = null;
            console.log("errorKey："+rKey);
         //   console.log(e);
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
    // console.log("sucKey："+rKey+"尝试"+index);
    return response1;
  } catch (error) {
    console.error(error);
    if (error instanceof OpenAIError) {
      console.log("errorKey："+error.message );
     let msg =  error.message;
      let response2 = new Response('含有敏感词 | IP已被记录，请换个问题 | 登录即无审核，前往-> https://vip.1ai.ink?ref=noCheck', {status: 500});
      response2.headers.set('Access-Control-Allow-Methods', 'GET,POST');
      // 允许跨域访问的 HTTP 头部字段
      response2.headers.set('Access-Control-Allow-Headers', '*');
      // 允许所有域名跨域访问
      response2.headers.set('Access-Control-Allow-Origin', '*');
      return response2;
    } else {
      let response3 = new Response('请求过于频繁，等待10秒再试...（报错时，前往稳定服-> https://vip.1ai.ink?ref=1chatError ）', { status: 500 });

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
