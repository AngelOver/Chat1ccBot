import { DEFAULT_SYSTEM_PROMPT, DEFAULT_TEMPERATURE } from '@/utils/app/const';
import { OpenAIError, OpenAIStream, createImage } from '@/utils/server';

import { ChatBody, Message } from '@/types/chat';

// @ts-expect-error
import wasm from '../../node_modules/@dqbd/tiktoken/lite/tiktoken_bg.wasm?module';

import tiktokenModel from '@dqbd/tiktoken/encoders/cl100k_base.json';
import { Tiktoken, init } from '@dqbd/tiktoken/lite/init';







const handler = async (req: Request): Promise<Response> => {
    try {
        let response = new Response('OK', { status: 200});
        response.headers.set('Access-Control-Allow-Methods', 'GET,POST');
        // 允许跨域访问的 HTTP 头部字段
        response.headers.set('Access-Control-Allow-Headers', '*');
        // 允许所有域名跨域访问
        response.headers.set('Access-Control-Allow-Origin', '*');
        response.headers.set('Access-Control-Allow-Origin', '*');


        // 如果是 OPTIONS 请求，返回跨域响应头即可
        if (req.method === 'OPTIONS') {
            return  response;
        }

        console.log(req);
        const { model, messages, key, prompt, temperature, generateImage } = (await req.json()) as ChatBody;
        const msg = messages[messages.length - 1].content;
        //console.log(msg);
        await init((imports) => WebAssembly.instantiate(wasm, imports));

        let promptToSend = prompt;
        if (!promptToSend) {
            promptToSend = DEFAULT_SYSTEM_PROMPT;
        }

        let temperatureToUse = temperature;
        if (temperatureToUse == null) {
            temperatureToUse = DEFAULT_TEMPERATURE;
        }
        // Fetch the image URL when the imagePrompt field is provided



        let stream = null;
        // stream = await OpenAIStream(model, promptToSend, temperatureToUse, key, messagesToSend);
        let maxRetry = 20;
        let index = 0;
        let retryCount = 0;
        let errorapikeys = {};
        let availableKeys = {};

        let rKey = '';

        //console.log("总"+maxRetry+"开始请求"+index+key);
        while (!stream &&maxRetry>0&& retryCount++ < maxRetry) {
            index++

            if(index>3){
                console.log("总"+maxRetry+"尝试"+index+rKey+msg);
            }
            try {
                stream = await OpenAIStream(model, promptToSend, temperatureToUse, rKey, []);
            }catch (e) {
                stream = null;
                console.log("errorKey："+rKey);
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
        console.log("sucKey："+rKey+"尝试"+index);
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
