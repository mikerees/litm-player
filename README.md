
# Legend in the Mist Game Server

  

A locally hosted, web-accessible game server for running Legend in the Mist roleplaying game sessions. Provides a visually appealing interface specifically designed for Legend in the Mist whilst being almost entirely hands off - the vast majority of rule implementation remains at the behest of the players and narrators. This is a glorified dice roller.

This is a passion project I have built for personal use that I am just providing publicly. You are welcome to use it, but it is at your own peril. This code is not robustly tested, so do not give people access to it that you do not inherently trust. Players will be connecting directly to your machine. One of the features of this involves the uploading of images which will be stored on the host's machine.

  

## Features

  
-  **Web Browser Access**: Players connect via standard web browsers with zero setup

-  **Local Hosting**: Server runs on your local machine

-  **Session Management**: Create and manage multiple game sessions

-  **Chat System**: In-game communication between players

-  **Dice Rolling**: Integrated dice system with tags

-  **Character Management**: Digital character sheets

-  **Notes System**: Collaborative note-taking for the group

-  **Responsive Design**: Works on desktop, tablet, and mobile devices

  

## Quick Start

  

### Prerequisites

  

- Node.js (v18 or higher) (https://nodejs.org/en/download/)

- npm or yarn (npm is bundled with node)

- Modern web browser

  

### Installation

  

1.  **Clone or download the project**

```bash

git clone https://github.com/mikerees/litm-player.git

```

Or go to the releases tab and download the recommended version. Point your console of choice to the cloned directory.

  

2.  **Install dependencies**

```bash

npm install

```

  

3.  **Start the server**

```bash

npm start

```

  

4.  **Access the game**

- Open your browser and go to `http://localhost:3000`

  

### Running the Software

  

1.  **Start the server**

```bash

npm start

```

  

2.  **Access the game**

- Open your browser and go to `http://localhost:3000`
- Use `lt` to expose the site publicly to those with access
```

# install localtunnel globally if you haven't already
npm i -g localtunnel
# create a temporary public URL for accessing the server
lt --port 3000

```
- Share the URL and access password with trusted players

  

## How to Use

  

### For Hosts
  

1.  **Start the server** using `npm run dev` or `npm start`

2.  **Create a new session** by entering your name and clicking "Create New Session"

3.  **Share the session ID** with your players

4.  **Manage the game** using the intuitive interface

  

### For Players

  

1.  **Receive the session ID** from the host

2.  **Open the game URL** in your web browser

3.  **Enter the session ID** and your name

4.  **Start playing** immediately - no downloads or accounts required

  

## Project Structure

  

```

litm-player/

├── .memorybank/ # Project documentation and memory bank

├── src/

│ ├── server/ # Backend code

│ │ ├── index.js # Main server file

│ │ ├── websocket.js # WebSocket handling

│ │ ├── gameState.js # Game state management

│ │ └── sessions.js # Session management

│ ├── client/ # Frontend code

│ │ ├── index.html # Main HTML file

│ │ ├── styles/ # CSS files

│ │ ├── scripts/ # JavaScript files

│ │ └── assets/ # Images, fonts, etc.

│ └── shared/ # Shared code between client/server

├── package.json # Dependencies and scripts

├── .gitignore # Git ignore rules

└── README.md # This file

```

  

## Development
 

### Technology Stack

  

-  **Backend**: Node.js, Express.js, Socket.io

-  **Frontend**: Vanilla JavaScript, HTML5, CSS3

-  **Real-time Communication**: WebSocket via Socket.io

-  **Development**: Nodemon, ESLint, Prettier

  

### Architecture

The application follows an event-driven architecture with:

-  **Single Source of Truth**: Server maintains authoritative game state

-  **Event Broadcasting**: All state changes broadcast to all connected clients

-  **Room-based Sessions**: Each game session is a Socket.io room

-  **Modular Design**: Separate modules for sessions, game state, and WebSocket handling

  
  

## Contributing

  

1. Fork the repository

2. Create a feature branch

3. Make your changes

4. Add tests if applicable

5. Submit a pull request

  

## License

  

This project is licensed under the MIT License - see the LICENSE file for details.

  

## Support

  

For issues, questions, or contributions:

  

1. Check the existing issues

2. Create a new issue with detailed information

3. Include browser version and error messages if applicable

  

## Acknowledgments

  

- Built for the Legend in the Mist roleplaying game community (well, for me, but for you guys too)
- Thanks to Son of Oak Game Studio for their incredible work that inspired this project