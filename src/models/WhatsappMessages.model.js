import { DataTypes } from 'sequelize';

export default (sequelize) => {
  return sequelize.define('whatsapp_messages', {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true
    },
    chat_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    whatsapp_message_id: {
      type: DataTypes.STRING(150),
      allowNull: false,
      unique: true
    },
    sender: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    receiver: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    message_type: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'chat'
    },
    timestamp: {
      type: DataTypes.BIGINT,
      allowNull: false
    },
    is_from_me: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
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
    }
  }, {
    tableName: 'whatsapp_messages',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });
};
