import { NextResponse } from "next/server";
import { personalExperiencePrompt } from "@/app-config";

export async function POST(request: Request) {
  const { question, model } = await request.json();
  const apiKey = process.env.SILICONFLOW_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "缺少SiliconFlow API密钥" },
      { status: 500 }
    );
  }

  const messages = [
    {
      role: "system",
      content: personalExperiencePrompt as string,
    },
    {
      role: "user",
      content: question,
    },
  ];

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    const response = await fetch(
      "https://api.siliconflow.cn/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: 1024,
          temperature: 0.7,
          stream: true,
        }),
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: `API错误: ${errorData.message || response.statusText}` },
        { status: response.status }
      );
    }

    // 创建可读流将数据转发给客户端
    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();
        if (!reader) {
          controller.close();
          return;
        }

        const decoder = new TextDecoder();
        let isControllerClosed = false;
        let accumulatedData = ''; // 用于累积不完整的JSON块

        // 监听客户端连接关闭事件
        request.signal.addEventListener('abort', () => {
          console.log('客户端连接已关闭');
          isControllerClosed = true;
          controller.close();
          reader.cancel();
        });

        try {
          while (true) {
            if (isControllerClosed) break;

            const { done, value } = await reader.read();

            if (done || isControllerClosed) {
              if (!isControllerClosed) {
                controller.close();
              }
              break;
            }

            // 解码接收到的数据
            const chunk = decoder.decode(value, { stream: true });
            accumulatedData += chunk;

            // 处理SSE格式数据
            const lines = accumulatedData.split("\n");

            // 最后一行可能是不完整的，保留到下一次处理
            accumulatedData = lines.pop() || '';

            for (const line of lines) {
              if (isControllerClosed) break;
              if (!line.trim()) continue; // 跳过空行

              if (line.startsWith("data: ")) {
                const data = line.substring(6);

                if (data === "[DONE]") {
                  controller.close();
                  isControllerClosed = true;
                  return;
                }

                try {
                  // 尝试解析JSON
                  const parsed = JSON.parse(data);
                  const content = parsed.choices[0]?.delta?.content || "";

                  if (content && !isControllerClosed) {
                    const sseChunk = `data: ${JSON.stringify({ content })}\n\n`;
                    controller.enqueue(new TextEncoder().encode(sseChunk));
                  }
                } catch (err: any) {
                  if (!isControllerClosed) {
                    console.error("解析流数据失败:", err.message);
                    console.error("原始数据:", data); // 打印原始数据用于调试

                    // 发送错误信息给客户端
                    controller.enqueue(
                      new TextEncoder().encode(`data: ${JSON.stringify({ error: "解析数据错误" })}\n\n`)
                    );
                  }
                }
              }
            }
          }
        } catch (err) {
          if (!isControllerClosed) {
            console.error("读取流失败:", err);
            controller.enqueue(
              new TextEncoder().encode(`data: ${JSON.stringify({ error: "服务器内部错误" })}\n\n`)
            );
            controller.close();
            isControllerClosed = true;
          }
        } finally {
          reader.releaseLock();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
        "Access-Control-Allow-Origin": "*",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error: any) {
    console.error("API调用失败：", error);

    if (error.name === 'AbortError') {
      return NextResponse.json(
        { error: "API请求超时，请重试" },
        { status: 504 }
      );
    }

    return NextResponse.json(
      { error: "调用AI模型失败，请重试" },
      { status: 500 }
    );
  }
}