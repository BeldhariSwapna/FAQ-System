import { useEffect, useRef, useCallback } from 'react';

const CLIENT_ID = '411209099641-5vc33p4ukqnmoo4h1tuvduc323hhc7jl.apps.googleusercontent.com';

export default function GoogleSignInButton({ onSuccess, onError, text = 'Sign in with Google' }) {
  const buttonRef = useRef(null);
  const initializedRef = useRef(false);

  const stableOnSuccess = useCallback(onSuccess, [onSuccess]);
  const stableOnError = useCallback(onError, [onError]);

  useEffect(() => {
    if (initializedRef.current) return;

    if (window.google?.accounts) {
      initGoogle();
      initializedRef.current = true;
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;

    script.onload = () => {
      initGoogle();
      initializedRef.current = true;
    };

    script.onerror = () => {
      stableOnError?.('Failed to load Google Sign-In. Check your internet connection or disable ad blocker.');
    };

    document.body.appendChild(script);

    return () => {
      const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
      if (existing && document.body.contains(existing)) {
        document.body.removeChild(existing);
      }
      initializedRef.current = false;
    };
  }, []);

  function initGoogle() {
    if (!window.google?.accounts || !buttonRef.current) return;

    window.google.accounts.id.initialize({
      client_id: CLIENT_ID,
      callback: (response) => {
        if (response.credential) {
          stableOnSuccess(response.credential);
        } else {
          stableOnError?.('No credential returned from Google. Please try again.');
        }
      },
      cancel_on_tap_outside: false,
      auto_select: false,
    });

    window.google.accounts.id.renderButton(buttonRef.current, {
      theme: 'outline',
      size: 'large',
      text: text.includes('Sign up') ? 'signup_with' : 'signin_with',
      shape: 'rectangular',
      width: buttonRef.current.offsetWidth || 360,
    });
  }

  return (
    <div ref={buttonRef} className="google-btn-wrapper" />
  );
}
