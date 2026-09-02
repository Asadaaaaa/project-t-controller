// Helpers
import { LoggerHelper as sendLogs } from '#helpers';

// Handlers
import MiddlewareHandler from './middlewares/Handler.middleware.js';
import RouteHandler from './routes/Handler.route.js';
import ModelHandler from './models/Handler.model.js';
import JobHandler from './jobs/Handler.job.js';
import { SocketHandler } from '#sockets';

// Library
import * as dotenv from 'dotenv';
import os from 'os';
import cluster from 'cluster';
import FS from 'fs-extra';
import Express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';

class Server {
    constructor() {
        this.sendLogs = sendLogs;
        this.FS = FS;

        if (!this.FS.existsSync('.env')) {
            this.sendLogs('Error: .env file not found. please create a .env file');
            return;
        }

        dotenv.config();
        this.env = process.env;

        const threads = parseInt(this.env.SERVER_THREADS || '1', 10);

        if (threads > 1) {
            this.serverThreads(threads);
        } else {
            this.init();
        }
    }

    serverThreads(threads) {
        const numCPUs = os.cpus().length;

        if (cluster.isPrimary) {
            this.sendLogs(`Total CPUs ${numCPUs}`);
            this.sendLogs(`Starting Server with ${threads} threads...`);

            for (let i = 0; i < threads; i++) {
                cluster.fork();
            }

            cluster.on('exit', (worker) => {
                this.sendLogs(`worker ${worker.process.pid} died, restarting...`);
                cluster.fork();
            });
        } else {
            this.init();
        }
    }

    async init() {
        if (this.env.DB_ENABLE === 'true') {
            this.model = new ModelHandler(this);
            const isModelConnected = await this.model.connect();
            if (isModelConnected === -1) return;
        }

        this.run();
        this.jobs = new JobHandler(this);
    }

    run() {
        this.API = Express();

        new MiddlewareHandler(this);
        new RouteHandler(this);

        this.httpServer = http.createServer(this.API);
        this.io = new SocketIOServer(this.httpServer, {
            cors: {
                origin: '*',
                methods: ['GET', 'POST']
            }
        });

        this.socketHandler = new SocketHandler(this);

        const port = this.env.PORT || 3000;
        const host = this.env.IP || '0.0.0.0';

        this.serverInstance = this.httpServer.listen(port, host, () => {
            this.sendLogs(`Server Started, Listening http://${host}:${port} (REST + Socket.IO)`);
        }).on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                this.sendLogs(`Port ${port} is already in use`);
                process.exit(1);
            } else {
                this.sendLogs(`Server Error: ${err.message}`);
            }
        });
    }
}

new Server();
