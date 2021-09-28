import React from "react";
import { Layout, Button, Input, Icon, Form, Row, Col, Card } from "antd";
import { ReactComponent as Logo } from "./assets/twilio-mark-red.svg";

const { Content } = Layout;

export class LoginPage extends React.Component {
  handleSubmit = async (e) => {
    e.preventDefault();

    const { form, onSubmit } = this.props;

    form.validateFields((err, values) => {
      if (!err) {
        const { identity, email, password } = values;
        onSubmit(identity, email, password);
      }
    });
  };

  render() {
    const { getFieldDecorator } = this.props.form;

    const identityFieldDecorator = getFieldDecorator("identity", {
      rules: [{ required: true, message: "Please input your identity!" }]
    });

    const emailFieldDecorator = getFieldDecorator("email", {
      rules: [{ required: true, message: "Please input your email!" }]
    });

    const passwordFieldDecorator = getFieldDecorator("password", {
      rules: [{ required: true, message: "Please input your password!" }]
    });

    return (
      <Layout>
        <Content style={{ height: "100vh" }}>
          <Row
            type="flex"
            justify="space-around"
            align="middle"
            style={{ height: "100%" }}
          >
            <Col span={12} offset={6}>
              <Card style={{ maxWidth: "404px" }}>
                <Row
                  type="flex"
                  justify="center"
                  align="middle"
                  style={{ marginBottom: "30px" }}
                >
                  <Logo />
                </Row>

                <Form onSubmit={this.handleSubmit}>
                  <Form.Item>
                    {identityFieldDecorator(
                      <Input
                        prefix={
                          <Icon
                            type="user"
                            style={{ color: "rgba(0,0,0,.25)" }}
                          />
                        }
                        placeholder="identity"
                      />
                    )}
                  </Form.Item>
                  <Form.Item>
                    {emailFieldDecorator(
                      <Input
                        prefix={
                          <Icon
                            type="mail"
                            style={{ color: "rgba(0,0,0,.25)" }}
                          />
                        }
                        placeholder="Email"
                      />
                    )}
                  </Form.Item>
                  <Form.Item>
                    {passwordFieldDecorator(
                      <Input
                        prefix={
                          <Icon
                            type="lock"
                            style={{ color: "rgba(0,0,0,.25)" }}
                          />
                        }
                        placeholder="password"
                      />
                    )}
                  </Form.Item>
                  <Form.Item>
                    <Button block type="primary" htmlType="submit">
                      Sign in
                    </Button>
                  </Form.Item>
                </Form>
              </Card>
            </Col>
          </Row>
        </Content>
      </Layout>
    );
  }
}

export default Form.create({ name: "login" })(LoginPage);
