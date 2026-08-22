import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Application error:', error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="max-w-md text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-destructive/10 border border-destructive/20 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-7 h-7 text-destructive" />
            </div>
            <h1 className="text-xl font-display font-bold">Something went wrong</h1>
            <p className="text-sm text-muted-foreground">
              The page encountered an unexpected error. Try reloading — your data is safe.
            </p>
            <Button onClick={this.handleReload} className="bg-gradient-neon text-white">
              Reload App
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}