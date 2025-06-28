// app/api/chat/route.ts
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
    // 调用SiliconFlow API（启用流式返回）
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
          stream: true, // 启用流式返回
        }),
      }
    );

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

        // 持续读取API响应流
        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            controller.close();
            break;
          }

          // 解码接收到的数据
          const chunk = decoder.decode(value);

          // 处理SSE格式数据（data: {...}\n\n）
          const lines = chunk.split("\n").filter((line) => line.trim() !== "");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.substring(6);

              // 特殊数据段表示流结束
              if (data === "[DONE]") {
                controller.close();
                return;
              }

              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices[0]?.delta?.content || "";

                // 将内容作为SSE格式发送给客户端
                if (content) {
                  controller.enqueue(
                    `data: ${JSON.stringify({ content })}\n\n`
                  );
                }
              } catch (err) {
                console.error("解析流数据失败:", err);
              }
            }
          }
        }
      },
    });

    // 返回SSE响应
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("API调用失败：", error);
    return NextResponse.json(
      { error: "调用AI模型失败，请重试" },
      { status: 500 }
    );
  }
}
