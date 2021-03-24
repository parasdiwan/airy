import React from 'react';
import styles from './index.module.scss';
import {Media, MediaRenderProps} from './Media';
import {CommandUnion} from '../../props';

export type Suggestion = {
  reply?: {
    text: string;
    postbackData: string;
  };
  action?: {
    text: string;
    postbackData: string;
    openUrlAction?: {
      url: string;
    };
    dialAction?: {
      phoneNumber: string;
    };
  };
};

export type RichCardRenderProps = {
  title?: string;
  description?: string;
  suggestions: Suggestion[];
  media: MediaRenderProps;
  cardWidth?: string;
  commandCallback?: (command: CommandUnion) => void;
};

export const RichCard = ({title, description, suggestions, media, cardWidth, commandCallback}: RichCardRenderProps) => {
  const clickSuggestion = (suggestion: Suggestion) => {
    if (suggestion.reply) {
      commandCallback &&
        commandCallback({
          type: 'suggestedReply',
          payload: {text: suggestion.reply.text, postbackData: suggestion.reply.postbackData},
        });
    } else if (suggestion.action) {
      commandCallback &&
        commandCallback({
          type: 'suggestedReply',
          payload: {text: suggestion.action.text, postbackData: suggestion.action.postbackData},
        });
      if (suggestion.action.openUrlAction?.url) {
        window.open(suggestion.action.openUrlAction.url, '_blank', 'noopener');
      } else if (suggestion.action.dialAction?.phoneNumber) {
        window.open(`tel:${suggestion.action.dialAction.phoneNumber}`, '_blank', 'noopener');
      }
    }
  };

  return (
    <>
      <div className={styles.richCardContainer} style={cardWidth === 'SHORT' ? {width: '136px'} : {width: '320px'}}>
        <div className={styles.mediaContainer}>
          <Media {...media} />
        </div>
        <div className={styles.textContainer}>
          {title && <h2 className={styles.title}>{title}</h2>}
          {description && <span className={styles.description}>{description}</span>}
          <div className={styles.suggestionsContainer}>
            {suggestions.map((suggestion: Suggestion, idx: number) => (
              <button
                type="button"
                key={idx}
                className={styles.suggestionButton}
                onClick={() => {
                  clickSuggestion(suggestion);
                }}>
                {suggestion.reply ? suggestion.reply.text : suggestion.action.text}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};
