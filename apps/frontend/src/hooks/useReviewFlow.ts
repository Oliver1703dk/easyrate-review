import { useReducer, useCallback } from 'react';
import { REVIEW_THRESHOLDS } from '@easyrate/shared';
import type {
  ReviewFlowState,
  ReviewFlowAction,
  ReviewFlowStep,
  ReviewRating,
} from '@easyrate/shared';

const initialState: ReviewFlowState = {
  step: 'loading',
  rating: null,
  feedbackText: '',
  photos: [],
  consentGiven: false,
  submittedExternalReview: false,
  error: null,
};

function reviewFlowReducer(state: ReviewFlowState, action: ReviewFlowAction): ReviewFlowState {
  switch (action.type) {
    case 'SET_RATING': {
      const isPositive = (REVIEW_THRESHOLDS.positive as readonly number[]).includes(action.rating);
      return {
        ...state,
        rating: action.rating,
        step: isPositive ? 'positive-prompt' : 'negative-feedback',
        error: null,
      };
    }
    case 'SET_FEEDBACK_TEXT':
      return {
        ...state,
        feedbackText: action.text,
      };
    case 'ADD_PHOTO':
      return {
        ...state,
        photos: [...state.photos, action.fileKey],
      };
    case 'REMOVE_PHOTO':
      return {
        ...state,
        photos: state.photos.filter((p) => p !== action.fileKey),
      };
    case 'SET_CONSENT':
      return {
        ...state,
        consentGiven: action.given,
      };
    case 'SUBMIT_START':
      return {
        ...state,
        step: 'submitting',
        error: null,
      };
    case 'SUBMIT_SUCCESS':
      return {
        ...state,
        step: 'thank-you',
        error: null,
      };
    case 'SUBMIT_ERROR':
      return {
        ...state,
        step: 'error',
        error: action.error,
      };
    case 'MARK_EXTERNAL_REVIEW':
      return {
        ...state,
        submittedExternalReview: true,
      };
    case 'SKIP_EXTERNAL_REVIEW':
      return {
        ...state,
        step: 'submitting',
        submittedExternalReview: false,
      };
    case 'RESET':
      return {
        ...initialState,
        step: 'rating',
      };
    default:
      return state;
  }
}

export function useReviewFlow() {
  const [state, dispatch] = useReducer(reviewFlowReducer, initialState);

  const setRating = useCallback((rating: ReviewRating) => {
    dispatch({ type: 'SET_RATING', rating });
  }, []);

  const setFeedbackText = useCallback((text: string) => {
    dispatch({ type: 'SET_FEEDBACK_TEXT', text });
  }, []);

  const startSubmit = useCallback(() => {
    dispatch({ type: 'SUBMIT_START' });
  }, []);

  const submitSuccess = useCallback(() => {
    dispatch({ type: 'SUBMIT_SUCCESS' });
  }, []);

  const submitError = useCallback((error: string) => {
    dispatch({ type: 'SUBMIT_ERROR', error });
  }, []);

  const markExternalReview = useCallback(() => {
    dispatch({ type: 'MARK_EXTERNAL_REVIEW' });
  }, []);

  const skipExternalReview = useCallback(() => {
    dispatch({ type: 'SKIP_EXTERNAL_REVIEW' });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  const setStep = useCallback((step: ReviewFlowStep) => {
    // Direct step setting for initialization
    if (step === 'rating') {
      dispatch({ type: 'RESET' });
    }
  }, []);

  return {
    state,
    setRating,
    setFeedbackText,
    startSubmit,
    submitSuccess,
    submitError,
    markExternalReview,
    skipExternalReview,
    reset,
    setStep,
  };
}
