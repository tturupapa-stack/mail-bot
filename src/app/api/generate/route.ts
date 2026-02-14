import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

function getOpenAI() {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

export async function POST(request: NextRequest) {
  try {
    const { email, tone, keyMessage } = await request.json();

    if (!email || !tone) {
      return NextResponse.json(
        { error: "이메일 내용과 톤을 입력해주세요." },
        { status: 400 }
      );
    }

    if (email.length > 5000) {
      return NextResponse.json(
        { error: "이메일 내용은 5000자 이내로 입력해주세요." },
        { status: 400 }
      );
    }

    const toneGuide: Record<string, string> = {
      정중: "정중하고 공손한 톤. 존댓말과 경어를 충분히 사용하되 과하지 않게.",
      친근: "친근하면서도 프로페셔널한 톤. 부드럽고 편안하지만 비즈니스 예의는 지킨다.",
      격식: "매우 격식 있는 톤. 공문서 수준의 격식체를 사용하고, 한자어와 공식적 표현을 활용.",
    };

    const systemPrompt = `당신은 한국 비즈니스 이메일 전문 작성자입니다.

## 규칙
1. 한국 비즈니스 이메일 매너를 철저히 반영합니다.
2. 적절한 존칭과 경어를 사용합니다.
3. 상황에 맞는 인사말과 마무리말을 포함합니다.
4. CC/참조가 있는 경우 적절한 톤으로 조절합니다.
5. 원본 이메일의 맥락을 정확히 파악하고 적절히 응답합니다.
6. 톤 가이드: ${toneGuide[tone] || toneGuide["정중"]}

## 출력 형식
정확히 3개의 답장 버전을 생성합니다:
- 짧은 버전: 핵심만 간결하게 (3-5문장)
- 보통 버전: 적절한 분량 (5-8문장)
- 상세 버전: 충분한 설명과 후속 조치 포함 (8-12문장)

반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트는 절대 포함하지 마세요:
{"replies":[{"label":"짧은","content":"..."},{"label":"보통","content":"..."},{"label":"상세","content":"..."}]}`;

    const userPrompt = `받은 이메일:
${email}

${keyMessage ? `답장에 포함할 핵심 메시지: ${keyMessage}` : ""}

위 이메일에 대한 ${tone} 톤의 비즈니스 답장 3개 버전을 생성해주세요.`;

    const completion = await getOpenAI().chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 2000,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json(
        { error: "AI 응답을 생성하지 못했습니다." },
        { status: 500 }
      );
    }

    const parsed = JSON.parse(content);
    return NextResponse.json(parsed);
  } catch (error: unknown) {
    console.error("Generate error:", error);

    if (error instanceof OpenAI.APIError) {
      if (error.status === 401) {
        return NextResponse.json(
          { error: "API 키가 유효하지 않습니다." },
          { status: 401 }
        );
      }
      if (error.status === 429) {
        return NextResponse.json(
          { error: "API 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요." },
          { status: 429 }
        );
      }
    }

    return NextResponse.json(
      { error: "답장 생성 중 오류가 발생했습니다. 다시 시도해주세요." },
      { status: 500 }
    );
  }
}
