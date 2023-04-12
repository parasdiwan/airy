import React, {useEffect, useState} from 'react';
import CodeEditor from '@uiw/react-textarea-code-editor';
import {getTopicInfo, setTopicSchema, checkCompatibilityOfNewSchema} from '../../../../actions';
import {connect, ConnectedProps} from 'react-redux';
import styles from './index.module.scss';
import {Button, ErrorPopUp} from 'components';
import {useTranslation} from 'react-i18next';

const mapDispatchToProps = {
  getTopicInfo,
  setTopicSchema,
  checkCompatibilityOfNewSchema,
};

const connector = connect(null, mapDispatchToProps);

type TopicDescriptionProps = {
  topicName: string;
  code: string;
  setCode: (code: string) => void;
  resetCode: () => void;
  hasBeenModified: boolean;
} & ConnectedProps<typeof connector>;

const TopicDescription = (props: TopicDescriptionProps) => {
  const {
    topicName,
    hasBeenModified,
    code,
    setCode,
    resetCode,
    getTopicInfo,
    setTopicSchema,
    checkCompatibilityOfNewSchema,
  } = props;

  useEffect(() => {
    getTopicInfo(topicName);
  }, []);

  const [isEditMode, setIsEditMode] = useState(false);
  const [firstTabSelected, setFirstTabSelected] = useState(true);
  const [showErrorPopUp, setShowErrorPopUp] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const {t} = useTranslation();

  const resetCodeAndEndEdition = () => {
    resetCode();
    setIsEditMode(false);
  };

  const SchemaSection = () => {
    return (
      <CodeEditor
        value={code}
        readOnly={!isEditMode}
        language="json5"
        autoFocus={isEditMode}
        placeholder=""
        onChange={evn => {
          if (isEditMode) setCode(evn.target.value);
        }}
        padding={15}
        style={{
          height: '100%',
          fontSize: 12,
          lineHeight: '20px',
          fontFamily: 'ui-monospace,SFMono-Regular,SF Mono,Consolas,Liberation Mono,Menlo,monospace',
          backgroundColor: 'transparent',
        }}
      />
    );
  };

  const MessageSection = () => {
    return <div>Last Message</div>;
  };

  return (
    <div className={`${isEditMode ? styles.containerEdit : styles.containerNoEdit}`} onClick={e => e.stopPropagation()}>
      <div className={styles.buttonsContainer}>
        <div className={styles.leftButtonsContainer}>
          <button
            className={`${!firstTabSelected ? styles.tabNotSelected : ''}`}
            onClick={() => {
              setFirstTabSelected(true);
            }}
          >
            Schema
          </button>
          <button
            className={`${firstTabSelected ? styles.tabNotSelected : ''}`}
            onClick={() => {
              setFirstTabSelected(false);
            }}
          >
            Last Message
          </button>
        </div>
        {firstTabSelected && (
          <div className={styles.rightButtonsContainer}>
            <Button
              onClick={() => {
                if (isJSON(code)) {
                  setIsEditMode(!isEditMode);
                  if (isEditMode && hasBeenModified) {
                    checkCompatibilityOfNewSchema(topicName, code)
                      .then(() => {
                        setTopicSchema(topicName, code).catch((e: string) => {
                          setIsEditMode(true);
                          setErrorMessage(e);
                          setShowErrorPopUp(true);
                          setTimeout(() => setShowErrorPopUp(false), 5000);
                        });
                      })
                      .catch((e: string) => {
                        setIsEditMode(true);
                        setErrorMessage(e);
                        setShowErrorPopUp(true);
                        setTimeout(() => setShowErrorPopUp(false), 5000);
                      });
                  }
                } else {
                  setIsEditMode(true);
                  setErrorMessage('JSON Not Valid');
                  setShowErrorPopUp(true);
                  setTimeout(() => setShowErrorPopUp(false), 5000);
                }
              }}
              styleVariant="normal"
              style={{padding: '16px', width: '60px', height: '30px', fontSize: 16}}
            >
              {isEditMode ? t('save') : t('edit')}
            </Button>
            {hasBeenModified && (
              <Button
                onClick={() => resetCodeAndEndEdition()}
                styleVariant="normal"
                style={{padding: '16px', width: '60px', height: '30px', fontSize: 16, marginLeft: 8}}
              >
                {t('reset')}
              </Button>
            )}
          </div>
        )}
      </div>
      {firstTabSelected ? <SchemaSection /> : <MessageSection />}
      {showErrorPopUp && <ErrorPopUp message={errorMessage} closeHandler={() => setShowErrorPopUp(false)} />}
    </div>
  );
};

export default connector(TopicDescription);

const isJSON = (string: string): boolean => {
  try {
    return JSON.parse(string) && !!string;
  } catch (e) {
    return false;
  }
};
