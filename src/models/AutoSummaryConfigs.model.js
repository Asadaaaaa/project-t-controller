import { DataTypes } from 'sequelize';

export default (sequelize) => {
  return sequelize.define('auto_summary_configs', {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    is_enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    send_time: {
      type: DataTypes.STRING(10), // Format: "HH:mm" (misal "18:00")
      allowNull: false,
      defaultValue: '18:00'
    },
    target_chat_id: {
      type: DataTypes.STRING(100), // e.g. "120363...@g.us" or "628...@c.us"
      allowNull: true
    },
    target_chat_name: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    target_chat_type: {
      type: DataTypes.ENUM('group', 'contact'),
      allowNull: false,
      defaultValue: 'group'
    },
    last_sent_date: {
      type: DataTypes.STRING(20), // "YYYY-MM-DD"
      allowNull: true
    },
    last_sent_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    last_sent_status: {
      type: DataTypes.STRING(50), // 'success', 'failed'
      allowNull: true
    },
    last_error_message: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'auto_summary_configs',
    paranoid: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    deletedAt: 'deleted_at'
  });
};
