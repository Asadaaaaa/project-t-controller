import { DataTypes } from 'sequelize';

export default (sequelize) => {
  return sequelize.define('contact_exceptions', {
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
    whatsapp_chat_id: {
      type: DataTypes.STRING(100), // e.g. "62812345678@c.us" or "120363xxx@g.us"
      allowNull: false
    },
    contact_name: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    phone_number: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    chat_type: {
      type: DataTypes.ENUM('contact', 'group'),
      allowNull: false,
      defaultValue: 'contact'
    },
    reason: {
      type: DataTypes.STRING(255),
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
    tableName: 'contact_exceptions',
    paranoid: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    deletedAt: 'deleted_at',
    indexes: [
      {
        fields: ['whatsapp_chat_id']
      },
      {
        fields: ['user_id']
      }
    ]
  });
};
