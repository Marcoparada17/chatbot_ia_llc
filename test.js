const axios = require('axios');

/**
 * Send lead data to the CRM and create a task linked to the lead.
 * @param {string} leadName - The name of the lead.
 * @param {string} phoneNumber - The phone number of the lead.
 * @param {string} assignedById - The ID of the assigned user.
 * @param {string} sourceId - The source of the lead.
 * @returns {Promise<void>}
 */
const sendLeadToCRM = async (
  leadName,
  phoneNumber,
  assignedById = '2',
  sourceId = 'Whatsapp - DRA.ANA CASTIBLANCO Live Chat'
) => {
  try {
    const leadUrl = 'https://colcargollc.bitrix24.com/rest/2/kyob1immghnaoj8z/crm.lead.add.json';
    const taskUrl = 'https://colcargollc.bitrix24.com/rest/2/kyob1immghnaoj8z/tasks.task.add.json';

    // Step 1: Create Lead
    const leadPayload = {
      fields: {
        TITLE: leadName,
        PHONE: [
          {
            VALUE: phoneNumber,
            VALUE_TYPE: 'WORK',
          },
        ],
        ASSIGNED_BY_ID: assignedById,
        SOURCE_ID: sourceId,
      },
    };

    const leadResponse = await axios.post(leadUrl, leadPayload, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const leadId = leadResponse.data.result;

    console.log('Lead successfully sent to CRM:', leadResponse.data);

    // Step 2: Create Task Linked to Lead
    const taskPayload = {
      fields: {
        TITLE: `Follow up with ${leadName}`,
        RESPONSIBLE_ID: assignedById, // Assign the task to the same user
        DESCRIPTION: `Follow up with the lead (Lead ID: ${leadId})`,
        UF_CRM_TASK: [`L_${leadId}`], // Link the task to the lead
        DEADLINE: new Date(new Date().getTime() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
      },
    };

    const taskResponse = await axios.post(taskUrl, taskPayload, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('Task successfully created:', taskResponse.data);
  } catch (error) {
    console.error('Error:', error.response ? error.response.data : error.message);
  }
};

// Example Usage
sendLeadToCRM('John Doe', '+1234567890');
