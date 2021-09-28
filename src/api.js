const axios = require("axios");

export const getRefreshedToken = async (emailAddress, password, identity) => {
  var authObj = await axios
    .post("https://backend.gogetwise.com/sms/token/", {
      email_address: emailAddress,
      password: password,
      identity: identity
    })
    .then((response) => {
      return { token: response.data.token, session_key: response.data.session_key };
    });
  debugger;
  return authObj;
};

export const createConversation = async (token, phone_number, identity) => {
  const session_key = localStorage.getItem("session_key");
  await axios.post("https://backend.gogetwise.com/sms/conversation/create/", {
    token: token,
    phone_number: phone_number,
    identity: identity
  }, { headers: { "Authorization": `Token ${session_key}` } });
};

export const deleteConversation = async (conversation_sid) => {
  const session_key = localStorage.getItem("session_key");
  await axios.delete(
    `https://backend.gogetwise.com/sms/conversation/delete/${conversation_sid}/`, { headers: { "Authorization": `Token ${session_key}` } }
  );
};

export const updateLastSeenMessage = async (conversation_sid) => {
  const session_key = localStorage.getItem("session_key");
  await axios.get(
    `https://backend.gogetwise.com/sms/conversation/${conversation_sid}/unseen/update/`, { headers: { "Authorization": `Token ${session_key}` } }
  );
};

export const getUnseenMessagesNumber = async (conversation_sid) => {
  debugger;
  const session_key = localStorage.getItem("session_key");
  return await axios
    .get(
      `https://backend.gogetwise.com/sms/conversation/${conversation_sid}/unseen/`, { headers: { "Authorization": `Token ${session_key}` } })
    .then((response) => {
      return response.data.unseen_messages;
    });
};
