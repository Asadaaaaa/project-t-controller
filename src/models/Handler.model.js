// Library
import { Sequelize } from "sequelize";
import UsersModel from './Users.model.js';
import RolesModel from './Roles.model.js';
import PermissionsModel from './Permissions.model.js';
import UserRolesModel from './UserRoles.model.js';
import RolePermissionsModel from './RolePermissions.model.js';
import WhatsappSessionsModel from './WhatsappSessions.model.js';
import WhatsappChatsModel from './WhatsappChats.model.js';
import WhatsappMessagesModel from './WhatsappMessages.model.js';
import DailySummariesModel from './DailySummaries.model.js';
import DailyTodosModel from './DailyTodos.model.js';
import WhatsappReimbursementsModel from './WhatsappReimbursements.model.js';
import AutoSummaryConfigsModel from './AutoSummaryConfigs.model.js';
import ContactExceptionsModel from './ContactExceptions.model.js';


class Handler {
    constructor(server) {
        this.server = server;
        this.models = {};
    }

    async connect() {
        this.server.sendLogs('Connecting to database...');
        try {
            this.db = new Sequelize({
                host: this.server.env.DB_HOST,
                port: this.server.env.DB_PORT,
                username: this.server.env.DB_USERNAME,
                password: this.server.env.DB_PASSWORD,
                database: this.server.env.DB_DATABASE,
                dialect: this.server.env.DB_DIALECT || 'mysql',
                logging: this.server.env.DB_LOGGING === 'true' ? (sql, queryObject) => {
                    this.server.sendLogs('Query: ' + sql);
                } : false
            });
            await this.db.authenticate();
        } catch (err) {
            this.server.sendLogs(err);
            return -1;
        }

        this.server.sendLogs(`Database "${this.db.config.database}" Connected`);
        this.initModels();
        
        return this.db;
    }

    initModels() {
        const users = UsersModel(this.db);
        const roles = RolesModel(this.db);
        const permissions = PermissionsModel(this.db);
        const userRoles = UserRolesModel(this.db);
        const rolePermissions = RolePermissionsModel(this.db);
        const whatsappSessions = WhatsappSessionsModel(this.db);
        const whatsappChats = WhatsappChatsModel(this.db);
        const whatsappMessages = WhatsappMessagesModel(this.db);
        const dailySummaries = DailySummariesModel(this.db);
        const dailyTodos = DailyTodosModel(this.db);
        const whatsappReimbursements = WhatsappReimbursementsModel(this.db);
        const autoSummaryConfigs = AutoSummaryConfigsModel(this.db);
        const contactExceptions = ContactExceptionsModel(this.db);

        // Auto-create table if not exists
        whatsappReimbursements.sync({ alter: true }).catch((err) => {
            this.server.sendLogs(`[ModelHandler] Error syncing whatsapp_reimbursements: ${err.message}`);
        });

        autoSummaryConfigs.sync({ alter: true }).catch((err) => {
            this.server.sendLogs(`[ModelHandler] Error syncing auto_summary_configs: ${err.message}`);
        });

        contactExceptions.sync({ alter: true }).catch((err) => {
            this.server.sendLogs(`[ModelHandler] Error syncing contact_exceptions: ${err.message}`);
        });

        // Associations
        users.belongsToMany(roles, { through: userRoles, foreignKey: 'user_id', as: 'roles' });
        roles.belongsToMany(users, { through: userRoles, foreignKey: 'role_id', as: 'users' });

        roles.belongsToMany(permissions, { through: rolePermissions, foreignKey: 'role_id', as: 'permissions' });
        permissions.belongsToMany(roles, { through: rolePermissions, foreignKey: 'permission_id', as: 'roles' });

        userRoles.belongsTo(users, { foreignKey: 'user_id', as: 'user' });
        userRoles.belongsTo(roles, { foreignKey: 'role_id', as: 'role' });

        rolePermissions.belongsTo(roles, { foreignKey: 'role_id', as: 'role' });
        rolePermissions.belongsTo(permissions, { foreignKey: 'permission_id', as: 'permission' });

        whatsappSessions.belongsTo(users, { foreignKey: 'user_id', as: 'user' });
        users.hasMany(whatsappSessions, { foreignKey: 'user_id', as: 'whatsapp_sessions' });

        whatsappSessions.hasMany(whatsappChats, { foreignKey: 'session_id', sourceKey: 'session_id', as: 'chats' });
        whatsappChats.belongsTo(whatsappSessions, { foreignKey: 'session_id', targetKey: 'session_id', as: 'session' });

        whatsappChats.hasMany(whatsappMessages, { foreignKey: 'chat_id', as: 'messages' });
        whatsappMessages.belongsTo(whatsappChats, { foreignKey: 'chat_id', as: 'chat' });

        dailySummaries.belongsTo(users, { foreignKey: 'user_id', as: 'user' });
        users.hasMany(dailySummaries, { foreignKey: 'user_id', as: 'summaries' });

        dailySummaries.hasMany(dailyTodos, { foreignKey: 'summary_id', as: 'todos' });
        dailyTodos.belongsTo(dailySummaries, { foreignKey: 'summary_id', as: 'summary' });

        autoSummaryConfigs.belongsTo(users, { foreignKey: 'user_id', as: 'user' });
        users.hasOne(autoSummaryConfigs, { foreignKey: 'user_id', as: 'auto_summary_config' });

        contactExceptions.belongsTo(users, { foreignKey: 'user_id', as: 'user' });
        users.hasMany(contactExceptions, { foreignKey: 'user_id', as: 'contact_exceptions' });

        this.models = {
            users,
            roles,
            permissions,
            user_roles: userRoles,
            role_permissions: rolePermissions,
            whatsapp_sessions: whatsappSessions,
            whatsapp_chats: whatsappChats,
            whatsapp_messages: whatsappMessages,
            daily_summaries: dailySummaries,
            daily_todos: dailyTodos,
            whatsapp_reimbursements: whatsappReimbursements,
            WhatsappReimbursements: whatsappReimbursements,
            auto_summary_configs: autoSummaryConfigs,
            AutoSummaryConfigs: autoSummaryConfigs,
            contact_exceptions: contactExceptions,
            ContactExceptions: contactExceptions
        };
    }
}

export default Handler;
