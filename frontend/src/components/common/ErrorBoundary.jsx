// frontend/src/components/common/ErrorBoundary.jsx
import React from 'react';
import PropTypes from 'prop-types';
import { AlertTriangle } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught error in a React component:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-screen bg-gray-100 dark:bg-dark-bg text-center">
          <AlertTriangle size={48} className="text-red-500" />
          <h1 className="mt-4 text-2xl font-bold">Something went wrong.</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            We've been notified of the issue. Please try refreshing the page.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

ErrorBoundary.propTypes = { children: PropTypes.node.isRequired };
export default ErrorBoundary;