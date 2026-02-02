import swaggerJsdoc from 'swagger-jsdoc';

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Chat App API',
            version: '1.0.0',
            description: 'API documentation for the Chat Application',
            license: {
                name: 'MIT',
                url: 'https://spdx.org/licenses/MIT.html',
            },
            contact: {
                name: 'Developer',
                email: 'dev@example.com',
            },
        },
        servers: [
            {
                url: 'http://localhost:5001/api',
                description: 'Development Server',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
        },
        security: [
            {
                bearerAuth: [],
            },
        ],
    },
    apis: ['./routes/*.js'], // Path to the API docs
};

const specs = swaggerJsdoc(options);

export default specs;
