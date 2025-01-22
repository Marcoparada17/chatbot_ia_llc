import { pushSSEUpdate } from '../../router/routes';
import pool from '../db';

/**
 * Insert or Update a User
 * Inserts a user into the database or updates the name if the user already exists.
 */
export const insertOrUpdateUser = async (userId: string, name: string | null) => {
  const query = `
    INSERT INTO users (user_id, name)
    VALUES ($1, $2)
    ON CONFLICT (user_id) DO UPDATE SET name = EXCLUDED.name
  `;

  try {
    const values = [userId, name];
    await pool.query(query, values);
    console.log('User inserted/updated successfully');

    // Push an SSE update when a user is inserted or updated
    pushSSEUpdate({
      type: 'NEW_USER',
      user: {
        user_id: userId,
        name,
      },
    });
  } catch (error) {
    console.error('Error inserting/updating user:', error);
    throw error;
  }
};

/**
 * Get All Users
 * Fetches all users from the database, ordered by their creation time.
 */
export const getAllUsers = async () => {
  const query = `SELECT * FROM users ORDER BY created_at`;

  try {
    const { rows } = await pool.query(query);
    return rows;
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
};

/**
 * Insert a Message
 * Adds a message to the database.
 */

export const insertMessage = async (
  userId: string,
  messageBody: string,
  messageType: string,
  direction: string
) => {
  const query = `
    INSERT INTO messages (user_id, message_body, message_type, direction)
    VALUES ($1, $2, $3, $4)
  `;
  const values = [userId, messageBody, messageType, direction];

  try {
    await pool.query(query, values);
    console.log('Message inserted successfully');

    // Push an SSE update when a message is inserted
    pushSSEUpdate({
      type: 'NEW_MESSAGE',
      user_id: userId,
      message: {
        id: `message-${Date.now()}`, // Generate a unique ID for the message
        message_body: messageBody,
        message_type: messageType,
        direction,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error inserting message:', error);
    throw error;
  }
};

/**
 * Update Message Status
 * Updates the status of a message (e.g., sent, delivered, read).
 */
export const updateMessageStatus = async (messageId: string, status: string) => {
  const query = `
    UPDATE messages SET status = $1 WHERE message_id = $2
  `;
  const values = [status, messageId];

  try {
    await pool.query(query, values);
    console.log('Message status updated successfully');
  } catch (error) {
    console.error('Error updating message status:', error);
    throw error;
  }
};

/**
 * Get Messages by User
 * Fetches all messages for a specific user, ordered by timestamp.
 */
export const getMessagesByUser = async (userId: string) => {
  const query = `
    SELECT 
      id, 
      user_id, 
      message_body, 
      message_type, 
      direction, 
      timestamp 
    FROM messages 
    WHERE user_id = $1 
    ORDER BY timestamp
  `;

  try {
    const { rows } = await pool.query(query, [userId]);
    return rows.map((row) => ({
      id: row.id,
      user_id: row.user_id,
      message_body: row.message_body,
      message_type: row.message_type,
      direction: row.direction, // Include direction
      timestamp: new Date(row.timestamp).toISOString(), // Format timestamp as ISO string
    }));
  } catch (error) {
    console.error('Error fetching messages for user:', error);
    throw error;
  }
};

/**
 * Get All Conversations
 * Fetches all conversations grouped by user, including aggregated messages for each user.
 */
export const getConversations = async () => {
  const query = `
    SELECT u.user_id, u.name, json_agg(json_build_object(
      'id', m.id,
      'message_body', m.message_body,
      'message_type', m.message_type,
      'direction', m.direction,
      'status', m.status,
      'timestamp', m.timestamp
    ) ORDER BY m.timestamp) AS messages
    FROM users u
    LEFT JOIN messages m ON u.user_id = m.user_id
    GROUP BY u.user_id, u.name
  `;

  try {
    const { rows } = await pool.query(query);
    return rows.map((row: any) => ({
      user_id: row.user_id,
      name: row.name,
      messages: row.messages || [],
    }));
  } catch (error) {
    console.error('Error fetching conversations:', error);
    throw error;
  }
};

/**
 * Get All Messages (Optional Utility)
 * Fetches all messages from the database (useful for debugging or admin tasks).
 */
export const getAllMessages = async () => {
  const query = `SELECT * FROM messages ORDER BY timestamp`;

  try {
    const { rows } = await pool.query(query);
    return rows;
  } catch (error) {
    console.error('Error fetching all messages:', error);
    throw error;
  }
};