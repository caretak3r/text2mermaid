import 'dotenv/config'
import express from 'express'
import axios from 'axios'
import cors from 'cors'
import { dirname } from 'path'
import { fileURLToPath } from 'url'

// Create __dirname equivalent
const __dirname = dirname(fileURLToPath(import.meta.url))

const app = express()
app.use(cors())
app.use(express.json())

const AI_PROVIDERS = {
  DEEPSEEK: 'deepseek',
  GEMINI: 'gemini',
}

const providerConfig = {
  [AI_PROVIDERS.DEEPSEEK]: {
    url: 'https://api.deepseek.com/v1/chat/completions',
    auth: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
    body: (prompt) => ({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'user',
          content: `Generate valid Mermaid.js code for: ${prompt}. 
          
Follow these guidelines:
1. Respond ONLY with the Mermaid code block, no explanations or markdown formatting
2. Ensure the syntax is valid for Mermaid.js
3. Use appropriate diagram type (flowchart, sequence, class, etc.) based on the request
4. Keep the diagram clean and readable
5. Use meaningful labels and descriptions
6. Do not include \`\`\`mermaid or \`\`\` tags

Example of good response format:
graph TD
    A[Client] -->|TCP/IP| B(Load Balancer)
    B -->|HTTP| C[Web Server]
    C -->|Query| D[Database]`,
        },
      ],
    }),
    responseParser: (res) => res.data.choices[0].message.content,
  },
  [AI_PROVIDERS.GEMINI]: {
    url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    headers: {
      'Content-Type': 'application/json',
    },
    body: (prompt) => ({
      contents: [
        {
          parts: [
            {
              text: `Generate valid Mermaid.js code for: ${prompt}. 
          
Follow these guidelines:
1. Respond ONLY with the Mermaid code block, no explanations or markdown formatting
2. Ensure the syntax is valid for Mermaid.js
3. Use appropriate diagram type (flowchart, sequence, class, etc.) based on the request
4. Keep the diagram clean and readable
5. Use meaningful labels and descriptions
6. Do not include \`\`\`mermaid or \`\`\` tags

Example of good response format:
graph TD
    A[Client] -->|TCP/IP| B(Load Balancer)
    B -->|HTTP| C[Web Server]
    C -->|Query| D[Database]`,
            },
          ],
        },
      ],
      safetySettings: {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_ONLY_HIGH',
      },
      generationConfig: {
        temperature: 0.5,
        topP: 0.8,
        topK: 40,
      },
    }),
    responseParser: (res) => res.data.candidates[0].content.parts[0].text,
  },
}

// Add a simulation endpoint that returns a mock response for testing
app.post('/api/simulate', (req, res) => {
  const { text } = req.body
  console.log('Simulation request for:', text)

  // Create a simple diagram based on the request text
  let mockCode

  if (text.toLowerCase().includes('ssh') && text.toLowerCase().includes('bastion')) {
    mockCode = `
sequenceDiagram
    participant User
    participant LocalMachine
    participant BastionHost
    participant TargetServer
    
    User->>LocalMachine: Generate SSH key pair
    Note over LocalMachine: Store private key locally
    LocalMachine->>BastionHost: Upload public key to authorized_keys
    LocalMachine->>TargetServer: Upload public key to authorized_keys
    
    User->>LocalMachine: ssh -i private_key user@bastion
    LocalMachine->>BastionHost: Authenticate with SSH key
    BastionHost->>LocalMachine: Authentication successful
    
    User->>BastionHost: ssh -i forwarded_key user@target
    BastionHost->>TargetServer: Authenticate with SSH key
    TargetServer->>BastionHost: Authentication successful
    BastionHost->>User: Secure connection established
`
  } else {
    mockCode = `
graph TD
    A[Start] --> B{Is it a diagram?}
    B -->|Yes| C[Generate Diagram]
    B -->|No| D[Show Error]
    C --> E[Display Result]
    D --> E
`
  }

  res.json({ code: mockCode.trim() })
})

app.post('/api/generate', async (req, res) => {
  console.log('Received request:', req.body)
  const { text, provider } = req.body
  const config = providerConfig[provider]

  if (!config) {
    console.error('Invalid provider:', provider)
    return res.status(400).json({ error: 'Invalid AI provider' })
  }

  try {
    const headers = {
      'Content-Type': 'application/json',
      ...(config.auth ? { Authorization: config.auth } : {}),
      ...(config.headers || {}),
    }

    console.log('Making request to:', config.url)
    console.log('With headers:', headers)
    console.log('With body:', config.body(text))

    const response = await axios.post(config.url, config.body(text), { headers })
    console.log('Response status:', response.status)

    const rawCode = config.responseParser(response)
    console.log('Raw code:', rawCode)

    // Check if the response contains valid mermaid code
    if (!rawCode || typeof rawCode !== 'string') {
      throw new Error('Invalid response format from AI provider')
    }

    const cleanedCode = rawCode.replace(/```(?:mer|mermaid)?/g, '').trim()

    // If the cleaned code is empty, throw an error
    if (!cleanedCode) {
      throw new Error('Empty diagram code received from AI provider')
    }

    res.json({ code: cleanedCode })
  } catch (error) {
    console.error('Full Error Context:', {
      url: config.url,
      requestBody: config.body(text),
      errorResponse: error.response?.data,
    })

    let errorMessage = 'API request failed'
    let errorDetails = error.message

    if (error.response) {
      errorMessage = `API request failed with status ${error.response.status}`
      errorDetails = error.response.data?.error || error.response.data || error.message
    }

    res.status(500).json({
      error: errorMessage,
      details: errorDetails,
    })
  }
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
