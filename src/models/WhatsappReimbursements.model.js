import { DataTypes } from 'sequelize';

export default (sequelize) => {
  return sequelize.define('whatsapp_reimbursements', {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true
    },
    whatsapp_message_id: {
      type: DataTypes.STRING(150),
      allowNull: false,
      unique: true
    },
    quoted_message_id: {
      type: DataTypes.STRING(150),
      allowNull: true
    },
    chat_id: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    chat_name: {
      type: DataTypes.STRING(200),
      allowNull: true
    },
    sender_phone: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    sender_name: {
      type: DataTypes.STRING(150),
      allowNull: true
    },
    reimburse_image_path: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    receipt_image_path: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    reimburse_amount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0
    },
    receipt_amount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0
    },
    difference_amount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0
    },
    difference_status: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: 'MATCH' // 'MATCH', 'OVERPAID', 'UNDERPAID', 'UNKNOWN'
    },
    merchant_name: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    receipt_date: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    reimburse_date: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    items_breakdown: {
      type: DataTypes.JSON,
      allowNull: true
    },
    anomalies: {
      type: DataTypes.JSON,
      allowNull: true
    },
    ai_notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    status: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: 'PENDING' // 'PENDING', 'APPROVED', 'REJECTED', 'FLAGGED'
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
    tableName: 'whatsapp_reimbursements',
    paranoid: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    deletedAt: 'deleted_at'
  });
};
