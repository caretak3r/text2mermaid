<template>
  <div class="container" :class="{ 'dark-mode': isDarkMode }">
    <!-- Theme Toggle -->
    <div class="theme-toggle">
      <span class="theme-label">Light</span>
      <label class="switch">
        <input type="checkbox" v-model="isDarkMode" />
        <span class="slider round"></span>
      </label>
      <span class="theme-label">Dark</span>
    </div>

    <header class="header">
      <h1>Text2Mermaid</h1>
      <p class="subtitle">
        Convert natural language to Mermaid diagrams or edit Mermaid code directly
      </p>
    </header>

    <!-- Main Content Area -->
    <div class="main-content">
      <!-- Left Panel -->
      <div class="left-panel">
        <!-- Text2Mermaid Input -->
        <div class="panel-section">
          <div class="section-header">
            <h2>Natural Language Input</h2>
          </div>
          <div class="panel-content">
            <div class="provider-selector">
              <label for="provider" class="provider-label">AI Provider:</label>
              <select v-model="selectedProvider" id="provider">
                <option value="deepseek">DeepSeek</option>
                <option value="gemini">Google Gemini</option>
                <option value="simulation">Simulation (Offline)</option>
              </select>
            </div>
            <textarea
              id="diagram-text"
              v-model="inputText"
              placeholder="Enter your diagram description..."
              class="input-textarea"
            ></textarea>
            <div class="action-buttons">
              <button @click="generateDiagram" class="primary-button">Generate Diagram</button>
              <button @click="clearInput" class="secondary-button">Clear</button>
            </div>
          </div>
        </div>

        <!-- Code Editor -->
        <div class="panel-section">
          <div class="section-header">
            <h2>Mermaid Code</h2>
          </div>
          <div class="panel-content">
            <textarea
              id="mermaid-code"
              v-model="mermaidCodeInput"
              placeholder="Mermaid code will appear here..."
              spellcheck="false"
              class="code-textarea"
              @input="debouncedRenderPreview"
            ></textarea>
            <div class="action-buttons">
              <button @click="renderPreview" class="primary-button">Render Preview</button>
              <button @click="copyToClipboard" class="secondary-button">Copy Code</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Panel: Preview -->
      <div class="right-panel">
        <div class="panel-section">
          <div class="section-header">
            <h2>Diagram Preview</h2>
          </div>
          <div class="panel-content">
            <div class="preview-container">
              <div v-if="loading" class="loading">Processing...</div>
              <div v-else class="mermaid-diagram" ref="mermaidContainer">
                <p v-if="!mermaidCode" class="empty-preview">Your diagram will appear here...</p>
              </div>
            </div>
            <div v-if="errorMessage" class="error">{{ errorMessage }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Examples Section -->
    <div class="examples-section">
      <div class="section-header">
        <h2>Examples</h2>
      </div>
      <div class="examples-container">
        <div class="example-card" @click="loadExample('flowchart')">
          <h3>Flowchart</h3>
          <p>Basic flowchart with nodes and edges</p>
        </div>
        <div class="example-card" @click="loadExample('sequence')">
          <h3>Sequence Diagram</h3>
          <p>Show interactions between objects</p>
        </div>
        <div class="example-card" @click="loadExample('class')">
          <h3>Class Diagram</h3>
          <p>Object-oriented class structure</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios'
import mermaid from 'mermaid'

export default {
  data() {
    return {
      inputText: '',
      mermaidCode: '',
      mermaidCodeInput: '',
      loading: false,
      selectedProvider: 'simulation',
      errorMessage: '',
      typingTimer: null,
      isDarkMode: false,
      examples: {
        flowchart: `graph TD
    A[Christmas] -->|Get money| B(Go shopping)
    B --> C{Let me think}
    C -->|One| D[Laptop]
    C -->|Two| E[iPhone]
    C -->|Three| F[Car]`,
        sequence: `sequenceDiagram
    participant Alice
    participant Bob
    Alice->>John: Hello John, how are you?
    loop Healthcheck
        John->>John: Fight against hypochondria
    end
    Note right of John: Rational thoughts <br/>prevail!
    John-->>Alice: Great!
    John->>Bob: How about you?
    Bob-->>John: Jolly good!`,
        class: `classDiagram
    Animal <|-- Duck
    Animal <|-- Fish
    Animal <|-- Zebra
    Animal : +int age
    Animal : +String gender
    Animal: +isMammal()
    Animal: +mate()
    class Duck{
      +String beakColor
      +swim()
      +quack()
    }
    class Fish{
      -int sizeInFeet
      -canEat()
    }
    class Zebra{
      +bool is_wild
      +run()
    }`,
      },
    }
  },
  mounted() {
    // Check for user preference in localStorage
    const savedTheme = localStorage.getItem('theme')
    if (savedTheme === 'dark') {
      this.isDarkMode = true
    } else if (!savedTheme) {
      // Check system preference
      this.isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches
    }

    this.initializeMermaid()
  },
  watch: {
    isDarkMode(newValue) {
      localStorage.setItem('theme', newValue ? 'dark' : 'light')
      this.initializeMermaid()
      // Re-render the diagram if one exists
      if (this.mermaidCode) {
        this.$nextTick(() => {
          this.renderPreview()
        })
      }
    },
  },
  methods: {
    initializeMermaid() {
      mermaid.initialize({
        startOnLoad: false,
        theme: this.isDarkMode ? 'dark' : 'neutral',
        flowchart: {
          useMaxWidth: true,
          htmlLabels: true,
          curve: 'basis',
        },
      })
    },
    async generateDiagram() {
      if (!this.inputText.trim()) {
        this.errorMessage = 'Please enter a diagram description'
        return
      }

      this.errorMessage = ''
      this.loading = true
      console.log('Generating diagram with text:', this.inputText)
      console.log('Using provider:', this.selectedProvider)

      try {
        // Use environment variable for backend URL or default to localhost in development
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'

        let endpoint = `${apiBaseUrl}/api/generate`
        const requestData = {
          text: this.inputText,
          provider: this.selectedProvider,
        }

        // Use simulation endpoint if simulation provider is selected
        if (this.selectedProvider === 'simulation') {
          endpoint = `${apiBaseUrl}/api/simulate`
          // For simulation endpoint, we only need to send the text
          delete requestData.provider
        }

        const response = await axios.post(endpoint, requestData)

        console.log('Received response:', response.data)
        this.mermaidCode = response.data.code
        this.mermaidCodeInput = response.data.code

        // Render the diagram
        this.renderPreview()
      } catch (error) {
        console.error('Error:', error)
        this.errorMessage = `Error: ${error.message || 'Failed to generate diagram'}`
      }
      this.loading = false
    },

    renderPreview() {
      this.errorMessage = ''
      const code = this.mermaidCodeInput.trim()

      if (!code) {
        return
      }

      this.$nextTick(() => {
        if (this.$refs.mermaidContainer) {
          try {
            // Clear previous content
            this.$refs.mermaidContainer.innerHTML = ''

            // Create a div with the mermaid class
            const mermaidDiv = document.createElement('div')
            mermaidDiv.className = 'mermaid'
            mermaidDiv.textContent = code

            // Append the div to the container
            this.$refs.mermaidContainer.appendChild(mermaidDiv)

            // Reset mermaid to avoid conflicts with previous renders
            try {
              // Initialize with the current theme setting
              this.initializeMermaid()
            } catch (initError) {
              console.warn('Mermaid re-initialization warning:', initError)
            }

            // Initialize mermaid with try/catch
            this.$nextTick(() => {
              try {
                mermaid.init(undefined, '.mermaid')
                this.mermaidCode = code // Update the stored code
              } catch (renderError) {
                console.error('Mermaid initialization error:', renderError)
                this.errorMessage = `Error rendering diagram: ${renderError.message}`
              }
            })
          } catch (error) {
            console.error('Diagram setup error:', error)
            this.errorMessage = `Error setting up diagram: ${error.message}`
          }
        } else {
          console.error('Mermaid container not found')
          this.errorMessage = 'Rendering container not found'
        }
      })
    },

    debouncedRenderPreview() {
      clearTimeout(this.typingTimer)
      this.typingTimer = setTimeout(() => {
        this.renderPreview()
      }, 1000) // Wait 1 second after typing stops
    },

    loadExample(type) {
      if (this.examples[type]) {
        this.mermaidCodeInput = this.examples[type]
        this.inputText = '' // Clear the natural language input
        this.renderPreview()
      }
    },

    clearInput() {
      this.inputText = ''
      this.mermaidCodeInput = ''
      this.mermaidCode = ''
      this.errorMessage = ''
      if (this.$refs.mermaidContainer) {
        this.$refs.mermaidContainer.innerHTML =
          '<p class="empty-preview">Your diagram will appear here...</p>'
      }
    },

    copyToClipboard() {
      if (!this.mermaidCodeInput) {
        this.errorMessage = 'No code to copy'
        return
      }

      navigator.clipboard
        .writeText(this.mermaidCodeInput)
        .then(() => {
          const originalText = this.errorMessage
          this.errorMessage = 'Code copied to clipboard!'
          setTimeout(() => {
            this.errorMessage = originalText
          }, 2000)
        })
        .catch((err) => {
          console.error('Failed to copy: ', err)
          this.errorMessage = 'Failed to copy to clipboard'
        })
    },
  },
}
</script>

<style>
/* ========== Base Styles ========== */
:root {
  --primary-color: #4f46e5;
  --primary-hover: #4338ca;
  --text-color: #333;
  --text-light: #6b7280;
  --bg-color: #fff;
  --bg-light: #f3f4f6;
  --bg-lighter: #f9fafb;
  --border-color: #e5e7eb;
  --border-hover: #d1d5db;
  --error-color: #ef4444;
  --error-bg: #fee2e2;
  --error-border: #fecaca;
  --shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

.dark-mode {
  --primary-color: #6271ff;
  --primary-hover: #819aff;
  --text-color: #e2e8f0;
  --text-light: #9ca3af;
  --bg-color: #1e1b4b;
  --bg-light: #312e81;
  --bg-lighter: #1f2937;
  --border-color: #4b5563;
  --border-hover: #6b7280;
  --error-color: #f87171;
  --error-bg: #7f1d1d;
  --error-border: #b91c1c;
  --shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2), 0 2px 4px -1px rgba(0, 0, 0, 0.1);
}

body,
html {
  margin: 0;
  padding: 0;
  height: 100%;
  overflow: hidden;
}

* {
  box-sizing: border-box;
  font-family: 'Courier New', 'Monaco', 'Consolas', monospace;
}

/* Container layout */
.container {
  display: flex;
  flex-direction: column;
  max-width: 100%;
  height: 100vh;
  padding: 1rem;
  margin: 0 auto;
  color: var(--text-color);
  background-color: var(--bg-lighter);
  overflow: hidden;
}

/* Header */
.header {
  text-align: center;
  margin-bottom: 1rem;
}

.header h1 {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--primary-color);
  margin: 0 0 0.25rem 0;
}

.subtitle {
  color: var(--text-light);
  font-size: 0.875rem;
  margin: 0;
}

/* Theme Toggle */
.theme-toggle {
  position: absolute;
  top: 1rem;
  right: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.theme-label {
  font-size: 0.75rem;
  color: var(--text-light);
}

/* Switch styling */
.switch {
  position: relative;
  display: inline-block;
  width: 48px;
  height: 24px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  transition: 0.4s;
  border-radius: 24px;
}

.slider:before {
  position: absolute;
  content: '';
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.4s;
  border-radius: 50%;
}

input:checked + .slider {
  background-color: var(--primary-color);
}

input:checked + .slider:before {
  transform: translateX(24px);
}

/* Main Content Layout */
.main-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  flex: 1;
  min-height: 0;
  height: calc(100vh - 12rem);
}

.left-panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  height: 100%;
}

.right-panel {
  height: 100%;
}

.panel-section {
  background-color: var(--bg-color);
  border-radius: 0.5rem;
  box-shadow: var(--shadow);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  height: 100%;
}

.panel-content {
  padding: 1rem;
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

/* Section Headers */
.section-header {
  background-color: var(--bg-light);
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--border-color);
}

.section-header h2 {
  font-size: 1rem;
  font-weight: 600;
  color: var(--primary-color);
  margin: 0;
}

/* Input elements */
.provider-selector {
  margin-bottom: 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.provider-label {
  font-size: 0.875rem;
  color: var(--text-color);
}

select {
  padding: 0.375rem 0.75rem;
  border-radius: 0.25rem;
  border: 1px solid var(--border-color);
  background-color: var(--bg-color);
  color: var(--text-color);
  font-size: 0.875rem;
}

.input-textarea,
.code-textarea {
  width: 100%;
  flex: 1;
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 0.375rem;
  font-size: 0.875rem;
  resize: none;
  background-color: var(--bg-color);
  color: var(--text-color);
}

.code-textarea {
  background-color: var(--bg-lighter);
}

/* Buttons */
.action-buttons {
  display: flex;
  gap: 0.75rem;
  margin-top: 0.75rem;
}

.primary-button,
.secondary-button {
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  font-weight: 500;
  border-radius: 0.25rem;
  cursor: pointer;
  transition: background-color 0.2s;
  border: none;
}

.primary-button {
  background-color: var(--primary-color);
  color: white;
}

.primary-button:hover {
  background-color: var(--primary-hover);
}

.secondary-button {
  background-color: var(--bg-light);
  color: var(--text-color);
}

.secondary-button:hover {
  background-color: var(--border-hover);
}

/* Preview Area */
.preview-container {
  flex: 1;
  border: 1px solid var(--border-color);
  border-radius: 0.375rem;
  padding: 1rem;
  background-color: var(--bg-color);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: auto;
}

.mermaid-diagram {
  width: 100%;
  height: 100%;
  background-color: var(--bg-color);
  overflow: auto;
}

.loading {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  color: var(--text-light);
}

.empty-preview {
  color: var(--text-light);
  text-align: center;
}

.error {
  color: var(--error-color);
  padding: 0.75rem;
  border: 1px solid var(--error-border);
  border-radius: 0.375rem;
  background-color: var(--error-bg);
  font-size: 0.875rem;
  margin-top: 0.75rem;
}

/* Examples Section */
.examples-section {
  background-color: var(--bg-color);
  border-radius: 0.5rem;
  box-shadow: var(--shadow);
  margin-top: 1rem;
  overflow: hidden;
}

.examples-container {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  padding: 1rem;
}

.example-card {
  border: 1px solid var(--border-color);
  border-radius: 0.375rem;
  padding: 0.75rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.example-card:hover {
  background-color: var(--bg-light);
}

.example-card h3 {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--primary-color);
  margin: 0 0 0.25rem 0;
}

.example-card p {
  font-size: 0.75rem;
  color: var(--text-light);
  margin: 0;
}

/* Customized scrollbar for textareas */
textarea::-webkit-scrollbar,
.preview-container::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

textarea::-webkit-scrollbar-track,
.preview-container::-webkit-scrollbar-track {
  background: var(--bg-lighter);
  border-radius: 4px;
}

textarea::-webkit-scrollbar-thumb,
.preview-container::-webkit-scrollbar-thumb {
  background: var(--border-hover);
  border-radius: 4px;
}

textarea::-webkit-scrollbar-thumb:hover,
.preview-container::-webkit-scrollbar-thumb:hover {
  background: var(--text-light);
}
</style>
