import React from "react";
import { Badge, Icon, Layout, Spin, Typography } from "antd";
import { Client as ConversationsClient } from "@twilio/conversations";

import "./assets/Conversation.css";
import "./assets/ConversationSection.css";
import { ReactComponent as Logo } from "./assets/twilio-mark-red.svg";

import Conversation from "./Conversation";
import LoginPage from "./LoginPage";
import Modal from "react-modal";
import {
  getRefreshedToken,
  createConversation,
  updateLastSeenMessage,
  getUnseenMessagesNumber
} from "./api";
import { ConversationsList } from "./ConversationsList";
import { HeaderItem } from "./HeaderItem";

const { Content, Sider, Header } = Layout;
const { Text } = Typography;
const style = {
  position: "fixed",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)"
};

class ConversationsApp extends React.Component {
  constructor(props) {
    super(props);

    const token = localStorage.getItem("token") || "";
    const loggedIn = token !== "";
    this.handleChange = this.handleChange.bind(this);
    this.createConversation = this.createConversation.bind(this);
    this.updateConversationUnseenMessages = this.updateConversationUnseenMessages.bind(
      this
    );
    this.state = {
      token: null,
      loggedIn,
      showModal: false,
      statusString: null,
      conversationsReady: false,
      conversations: [],
      conversationUnseenNumbers: [],
      selectedConversationSid: null,
      newMessage: "",
      createNumber: ""
    };
  }

  componentDidMount = () => {
    if (this.state.loggedIn) {
      this.setState({ statusString: "Fetching credentials…" });
      var token = this.state.token;
      if (!token) {
        token = localStorage.getItem("token");
      }
      this.setState({ token: token }, this.initConversations);
    }
  };

  showModalHandler = (event) => {
    this.setState({ showModal: true });
  };

  hideModalHandler = (event) => {
    this.setState({ showModal: false });
  };

  logIn = async (identity, email, password) => {
    if (identity !== "" && email !== "" && password !== "") {
      localStorage.setItem("identity", identity);
      localStorage.setItem("email", email);
      localStorage.setItem("password", password);
      var authObj = await this.getToken(identity, email, password);
      localStorage.setItem("token", authObj.token);
      localStorage.setItem("session_key", authObj.session_key);

      this.setState(
        { token: authObj.token, loggedIn: true, conversationsReady: true },
        this.initConversations
      );
    }
  };

  getToken = async (identity, email, password) => {
    return await getRefreshedToken(email, password, identity);
  };

  handleChange(event) {
    this.setState({ createNumber: event.target.value });
    event.preventDefault();
  }

  logOut = (event) => {
    if (event) {
      event.preventDefault();
    }

    this.setState({
      token: null,
      loggedIn: false,
      showModal: false,
      statusString: null,
      conversationsReady: false,
      conversations: [],
      conversationUnseenNumbers: [],
      selectedConversationSid: null,
      newMessage: "",
      create_number: ""
    });

    localStorage.removeItem("identity");
    localStorage.removeItem("email");
    localStorage.removeItem("password");
    localStorage.removeItem("token");
    localStorage.removeItem("session_key");
    if (this.conversationsClient != null) {
      this.conversationsClient.shutdown();
    }
  };

  createConversation = (event) => {
    debugger;
    const identity = localStorage.getItem("identity");
    const token = localStorage.getItem("token");
    createConversation(token, this.state.createNumber, identity);
    this.setState(
      { createNumber: "", showModal: false, conversations: [] },
      this.initConversations
    );
    event.preventDefault();
  };

  updateConversationUnseenMessages = () => {
    this.state.conversations.forEach(async (conversation) => {
      getUnseenMessagesNumber(conversation.sid).then((unseenMessages) => {
        this.setState({
          conversationUnseenNumbers: [
            ...this.state.conversationUnseenNumbers.filter(
              (it) => it.sid !== conversation.sid
            ),
            { sid: conversation.sid, unseenMessages: unseenMessages }
          ]
        });
      });
    });
  };

  initConversations = async () => {
    window.conversationsClient = ConversationsClient;
    this.conversationsClient = await ConversationsClient.create(
      this.state.token
    );
    this.setState({ statusString: "Connecting to Twilio…", conversations: [] });

    this.conversationsClient.on("connectionStateChanged", (state) => {
      if (state === "connecting")
        this.setState({
          statusString: "Connecting to Twilio…",
          status: "default"
        });
      if (state === "connected") {
        this.setState({
          statusString: "You are connected.",
          status: "success"
        });
      }
      if (state === "disconnecting")
        this.setState({
          statusString: "Disconnecting from Twilio…",
          conversationsReady: false,
          status: "default"
        });
      if (state === "disconnected")
        this.setState({
          statusString: "Disconnected.",
          conversationsReady: false,
          status: "warning"
        });
      if (state === "denied")
        this.setState({
          statusString: "Failed to connect.",
          conversationsReady: false,
          status: "error"
        });
    });
    this.conversationsClient.on("conversationAdded", (conversation) => {
      debugger;
      this.setState({
        conversations: [
          ...this.state.conversations.filter(
            (it) => it.entityName !== conversation.entityName
          ),
          conversation
        ]
      });
    });
    this.conversationsClient.on("conversationRemoved", (thisConversation) => {
      this.setState({
        conversations: [
          ...this.state.conversations.filter((it) => it !== thisConversation)
        ]
      });
    });
    this.conversationsClient.on("messageAdded", (conversation) => {
      debugger;
      this.updateConversationUnseenMessages();
    });
  };

  render() {
    const {
      conversations,
      selectedConversationSid,
      status,
      conversationUnseenNumbers
    } = this.state;
    const selectedConversation = conversations.find(
      (it) => it.sid === selectedConversationSid
    );

    let conversationContent;
    if (selectedConversation) {
      conversationContent = (
        <Conversation
          conversationProxy={selectedConversation}
          myIdentity={this.state.name}
        />
      );
    } else if (status !== "success") {
      conversationContent = "Loading your conversation!";
    } else {
      conversationContent = "";
    }

    if (this.state.loggedIn) {
      return (
        <div className="conversations-window-wrapper">
          <Layout className="conversations-window-container">
            <Header
              style={{ display: "flex", alignItems: "center", padding: 0 }}
            >
              <div
                style={{
                  maxWidth: "250px",
                  width: "100%",
                  display: "flex",
                  alignItems: "center"
                }}
              >
                <HeaderItem style={{ paddingRight: "0", display: "flex" }}>
                  <Logo />
                </HeaderItem>
                <HeaderItem>
                  <Text strong style={{ color: "white" }}>
                    Conversations
                  </Text>
                </HeaderItem>
                <HeaderItem>
                  <Icon
                    type="plus"
                    onClick={this.showModalHandler}
                    style={{
                      color: "white",
                      fontSize: "20px",
                      marginLeft: "auto"
                    }}
                  />
                </HeaderItem>
              </div>
              <div style={{ display: "flex", width: "100%" }}>
                <HeaderItem>
                  <Text strong style={{ color: "white" }}>
                    {selectedConversation &&
                      (selectedConversation.friendlyName ||
                        selectedConversation.sid)}
                  </Text>
                </HeaderItem>
                <HeaderItem style={{ float: "right", marginLeft: "auto" }}>
                  <span
                    style={{ color: "white" }}
                  >{` ${this.state.statusString}`}</span>
                  <Badge
                    dot={true}
                    status={this.state.status}
                    style={{ marginLeft: "1em" }}
                  />
                </HeaderItem>
                <HeaderItem>
                  <Icon
                    type="reload"
                    onClick={this.updateConversationUnseenMessages}
                    style={{
                      color: "white",
                      fontSize: "20px",
                      marginLeft: "auto"
                    }}
                  />
                </HeaderItem>
                <HeaderItem>
                  <Icon
                    type="poweroff"
                    onClick={this.logOut}
                    style={{
                      color: "white",
                      fontSize: "20px",
                      marginLeft: "auto"
                    }}
                  />
                </HeaderItem>
              </div>
            </Header>
            <Layout>
              <Sider theme={"light"} width={250}>
                <ConversationsList
                  conversations={conversations}
                  conversationsUnseenNumbers={conversationUnseenNumbers}
                  selectedConversationSid={selectedConversationSid}
                  onConversationClick={(item) => {
                    updateLastSeenMessage(item.sid);
                    this.updateConversationUnseenMessages();
                    this.setState({ selectedConversationSid: item.sid });
                  }}
                />
              </Sider>
              <div>
                <Modal
                  isOpen={this.state.showModal}
                  contentLabel="Create Conversation"
                  style={style}
                >
                  <div>
                    Enter the number you wish to create a conversation with in
                    the format +1XXXXXXXXXX
                  </div>
                  <form onSubmit={this.createConversation}>
                    <input
                      type="text"
                      value={this.state.createNumber}
                      onChange={this.handleChange}
                    />
                    <input type="submit" value="submit" />
                  </form>
                  <button onClick={this.hideModalHandler}>cancel</button>
                </Modal>
              </div>
              <Content className="conversation-section">
                <div id="SelectedConversation">{conversationContent}</div>
              </Content>
            </Layout>
          </Layout>
        </div>
      );
    }

    return <LoginPage onSubmit={this.logIn} />;
  }
}

export default ConversationsApp;
