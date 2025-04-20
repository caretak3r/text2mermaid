# Text2Mermaid

A web application that converts text descriptions into Mermaid diagrams using AI.

## Overview

Text2Mermaid is a Vue.js application that allows users to:
- Enter a text description of a diagram
- Select an AI provider (DeepSeek, Google Gemini, or Simulation mode)
- Generate a Mermaid diagram based on the text description
- View the rendered diagram

## Features

- **Multiple AI Providers**: Choose between DeepSeek and Google Gemini for diagram generation
- **Simulation Mode**: Generate diagrams offline using predefined templates
- **Real-time Rendering**: Diagrams are rendered immediately after generation
- **Error Handling**: Clear error messages for API failures or rendering issues

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository
   ```
   git clone https://github.com/yourusername/text2mermaid.git
   cd text2mermaid
   ```

2. Install dependencies for the frontend
   ```
   npm install
   ```

3. Install dependencies for the backend
   ```
   cd backend
   npm install
   cd ..
   ```

4. Set up environment variables:
   - Copy `backend/.env.template` to `backend/.env`
   - Add your DeepSeek and Gemini API keys in the `.env` file

### Running the Application

1. Start the backend server:
   ```
   cd backend
   npm run dev
   ```

2. In a new terminal, start the frontend:
   ```
   npm run dev
   ```

3. Open your browser and navigate to `http://localhost:5173/`

## Usage

1. Select an AI provider from the dropdown menu (or use Simulation for testing)
2. Enter a text description of the diagram you want to create
3. Click "Generate Diagram"
4. View the rendered Mermaid diagram

Example description:
```
create a diagram of a user using ssh keys to log into a bastion host
```

## Troubleshooting

- If the AI providers are not responding, use the Simulation mode for testing
- Check that your API keys are correctly set in the backend `.env` file
- Make sure both frontend and backend servers are running

## Technology Stack

- **Frontend**: Vue.js, Mermaid.js
- **Backend**: Node.js, Express
- **API Integration**: DeepSeek AI API, Google Gemini API

## License

This project is licensed under the MIT License - see the LICENSE file for details.
