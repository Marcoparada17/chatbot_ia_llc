# WhatsApp Chatbot - Dr. Ana Castiblanco Medical Consultations

A sophisticated WhatsApp chatbot system designed to handle medical consultation bookings for Dr. Ana Castiblanco's otoplasty practice. The chatbot, named "Luna", provides automated customer service, appointment scheduling, and information about otoplasty procedures.

## 🏥 Overview

This chatbot serves as an intelligent virtual assistant for Dr. Ana Castiblanco's medical practice, specializing in otoplasty procedures. It handles:

- **Customer inquiries** about otoplasty procedures
- **Appointment scheduling** with Google Calendar integration
- **Payment processing** and verification
- **Patient data collection** and management
- **Before/after photo sharing**
- **Multi-city support** (Bogotá, Barranquilla, Medellín, Cartagena, Bucaramanga, Pereira)

## 🚀 Features

### Core Functionality
- **WhatsApp Integration**: Real-time messaging via WhatsApp Business API
- **AI-Powered Responses**: OpenAI GPT-4 integration for natural conversations
- **Calendar Management**: Google Calendar integration for appointment booking
- **Payment Processing**: Handles payment verification and methods
- **Media Handling**: Supports images, audio messages, and file uploads
- **Multi-language Support**: Spanish language optimized

### Advanced Features
- **Automated Follow-up**: Scheduled message sequences for lead nurturing
- **Blacklist Management**: Ability to stop/start bot interactions per user
- **Real-time Monitoring**: Server-Sent Events (SSE) for live updates
- **Database Storage**: PostgreSQL for user data and message history
- **Caching**: Redis for session management and performance
- **Docker Support**: Containerized deployment

### Medical Practice Specific
- **Otoplasty Information**: Detailed procedure information and pricing
- **Promotional Offers**: 10% discount management
- **Consultation Booking**: Virtual consultation scheduling ($80,000 COP)
- **Laboratory Information**: Partner lab details for medical exams
- **Before/After Photos**: Automated image sharing
- **Office Locations**: Multi-city practice information

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   WhatsApp API  │    │   OpenAI API    │    │ Google Calendar │
│                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   Node.js App   │
                    │   (Express)     │
                    └─────────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     Redis       │    │   PostgreSQL    │    │   File System   │
│   (Caching)     │    │   (Database)    │    │   (Media)       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 📁 Project Structure

```
chatbot_jose/
├── src/
│   ├── db/                    # Database operations
│   │   ├── controllers/       # Database controllers
│   │   └── db.ts             # Database connection
│   ├── google-calendar/       # Google Calendar integration
│   │   ├── authenticate-script.ts
│   │   ├── book-event.ts
│   │   ├── client.ts
│   │   └── find-available-times.ts
│   ├── openai/               # OpenAI integration
│   │   ├── client/           # OpenAI client
│   │   ├── format-date/      # Date formatting
│   │   ├── threads/          # Thread management
│   │   ├── transcript/       # Audio transcription
│   │   └── upload-image/     # Image processing
│   ├── redis/                # Redis client
│   ├── router/               # Express routes
│   │   ├── bot_routes.ts     # Main bot endpoints
│   │   └── media_routes.ts   # Media handling
│   ├── types/                # TypeScript types
│   ├── utils/                # Utility functions
│   └── server.ts             # Main server file
├── images/                   # Static images
├── Dockerfile               # Docker configuration
├── docker-compose.yml       # Docker services
├── package.json             # Dependencies
├── prompt_v2.txt            # AI prompt configuration
└── training.json            # Training data
```

## 🛠️ Technology Stack

- **Backend**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Caching**: Redis
- **AI**: OpenAI GPT-4 (Assistants API)
- **Calendar**: Google Calendar API
- **Messaging**: WhatsApp Business API
- **Containerization**: Docker & Docker Compose
- **Media Processing**: FFmpeg

## ⚙️ Installation & Setup

### Prerequisites
- Node.js 22+
- Docker & Docker Compose
- PostgreSQL
- Redis
- FFmpeg

### Environment Variables
Create a `.env` file with the following variables:

```env
# Server
PORT=3000
BACKEND_API_URL=http://localhost:3000

# Database
PG_USER=postgres
PG_HOST=localhost
PG_DATABASE=whatsapp_messages
PG_PASSWORD=password
PG_PORT=5432

# Redis
REDIS_URL=redis://localhost:6379

# OpenAI
OPENAI_KEY=your_openai_api_key

# WhatsApp
WHATSAPP_API_TOKEN=your_whatsapp_api_token
VERIFY_TOKEN=your_webhook_verify_token

# Google Calendar
GOOGLE_CALENDAR_CLIENT_ID=your_google_client_id
GOOGLE_CALENDAR_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALENDAR_REFRESH_TOKEN=your_google_refresh_token
```

### Quick Start with Docker

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd chatbot_jose
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your actual values
   ```

3. **Start the services**
   ```bash
   docker-compose up -d
   ```

4. **Access the application**
   - Main app: http://localhost:3000
   - Redis: localhost:6379
   - PostgreSQL: localhost:5432

### Manual Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up database**
   ```bash
   # The app will automatically create tables on startup
   ```

3. **Start the application**
   ```bash
   npm start
   ```

## 🔧 Configuration

### WhatsApp Webhook Setup
1. Configure your WhatsApp Business API webhook URL
2. Set the verify token in your `.env` file
3. The webhook endpoint is available at `/webhook`

### Google Calendar Authentication
1. Set up Google Cloud Project
2. Enable Google Calendar API
3. Create OAuth 2.0 credentials
4. Run the authentication script:
   ```bash
   npm run auth
   ```

### OpenAI Assistant Setup
1. Create an OpenAI assistant using the prompt in `prompt_v2.txt`
2. Update the assistant ID in your configuration

## 📡 API Endpoints

### Bot Routes
- `GET /webhook` - WhatsApp webhook verification
- `POST /webhook` - WhatsApp message processing
- `POST /sendMessage` - Send WhatsApp message
- `GET /users` - Get all users
- `GET /users/:user_id/messages` - Get user messages
- `POST /blacklist` - Add user to blacklist
- `DELETE /blacklist/:user_id` - Remove user from blacklist
- `GET /sse` - Server-Sent Events for real-time updates

### Media Routes
- `GET /media/*` - Serve static media files

## 🤖 Chatbot Flow

1. **Initial Contact**: User sends first message
2. **Greeting**: Luna introduces herself and asks for name/city
3. **Information Gathering**: Collects user preferences and questions
4. **Procedure Information**: Provides otoplasty details and pricing
5. **Appointment Scheduling**: Checks availability and books consultations
6. **Payment Processing**: Handles payment verification
7. **Confirmation**: Sends appointment details and Google Meet link
8. **Follow-up**: Automated message sequences for lead nurturing

## 🔒 Security Features

- **Message Deduplication**: Prevents duplicate message processing
- **User Blacklisting**: Ability to stop bot interactions
- **Input Validation**: Sanitizes all user inputs
- **Rate Limiting**: Built-in protection against spam
- **Secure Webhooks**: Token-based verification

## 📊 Monitoring & Analytics

- **Real-time Updates**: SSE for live monitoring
- **Message Logging**: Complete conversation history
- **User Analytics**: Track user interactions and conversions
- **Error Logging**: Comprehensive error tracking

## 🚀 Deployment

### Production Considerations
- Use environment-specific configurations
- Set up proper SSL certificates
- Configure reverse proxy (nginx)
- Set up monitoring and logging
- Use production-grade databases
- Implement backup strategies

### Scaling
- Horizontal scaling with load balancers
- Database connection pooling
- Redis clustering for high availability
- CDN for media files

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the ISC License.

## 🆘 Support

For support and questions:
- Check the documentation
- Review the code comments
- Contact the development team

## 🔄 Updates

The chatbot is regularly updated with:
- New features and improvements
- Bug fixes and security patches
- Enhanced AI responses
- Better user experience

---

**Note**: This chatbot is specifically designed for Dr. Ana Castiblanco's medical practice and handles sensitive medical information. Ensure compliance with healthcare data protection regulations in your jurisdiction. 