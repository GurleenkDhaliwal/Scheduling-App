import Anthropic from '@anthropic-ai/sdk'

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  try {
    const { customerName, service, time } = JSON.parse(event.body ?? '{}')

    const client = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY })

    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 200,
      messages: [
        {
          role: 'user',
          content: `Write a warm, friendly 2-sentence booking confirmation for ${customerName}, who has booked a ${service} appointment at ${time}. Be personal and welcoming.`,
        },
      ],
    })

    const textBlock = msg.content.find((b) => b.type === 'text')
    const message = textBlock?.text ?? 'Your booking is confirmed!'

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    }
  } catch (err) {
    console.error('confirm-booking error:', err)
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Failed to generate confirmation' }),
    }
  }
}
