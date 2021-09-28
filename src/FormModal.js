import React from "react";
import Modal from "react-modal";

class FormModal extends React.Component {
  render() {
    const formContent = <div>"test"</div>;
    const modal = this.props.showModal ? <div>{formContent}</div> : null;
      return <div>
          <button onClick={openModal}>Open Modal</button>
          <Modal
              isOpen={modalIsOpen}
              onAfterOpen={afterOpenModal}
              onRequestClose={closeModal}
              style={customStyles}
              contentLabel="Example Modal"
          >
              <h2 ref={(_subtitle) => (subtitle = _subtitle)}>Hello</h2>
              <button onClick={closeModal}>close</button>
              <div>I am a modal</div>
              <form>
                  <input />
                  <button>tab navigation</button>
                  <button>stays</button>
                  <button>inside</button>
                  <button>the modal</button>
              </form>
          </Modal>
      </div>;
  }
}

export default FormModal;
