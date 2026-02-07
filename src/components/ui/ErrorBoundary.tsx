import React, { Component, ErrorInfo, ReactNode } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "./button";

interface Props {
    children?: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    private handleReset = () => {
        this.setState({ hasError: false, error: undefined });
        window.location.reload();
    };

    public render() {
        if (this.state.hasError) {
            if (this.props.fallback) return this.props.fallback;

            return (
                <div className="min-h-screen flex items-center justify-center bg-[#FFFBF7] p-6">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="max-w-md w-full bg-white rounded-3xl shadow-xl shadow-orange-100/50 p-8 text-center border border-orange-50"
                    >
                        <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                            <AlertTriangle className="w-8 h-8 text-orange-600" />
                        </div>

                        <h1 className="text-2xl font-bold text-gray-900 mb-2">Eyvah! Bir şeyler ters gitti.</h1>
                        <p className="text-gray-500 mb-8">
                            Üzgünüz, beklenmedik bir hata oluştu. Sayfayı yenileyerek tekrar deneyebilirsiniz.
                        </p>

                        <div className="flex flex-col gap-3">
                            <Button
                                onClick={this.handleReset}
                                className="bg-orange-500 hover:bg-orange-600 text-white h-12 rounded-xl font-bold"
                            >
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Sayfayı Yenile
                            </Button>
                            <Button
                                variant="ghost"
                                onClick={() => window.location.href = "/"}
                                className="h-12 rounded-xl text-gray-500 hover:text-orange-600"
                            >
                                <Home className="w-4 h-4 mr-2" />
                                Ana Sayfaya Dön
                            </Button>
                        </div>

                        {process.env.NODE_ENV === "development" && this.state.error && (
                            <div className="mt-8 p-4 bg-red-50 rounded-xl text-left overflow-auto max-h-40">
                                <p className="text-xs font-mono text-red-700 whitespace-pre">
                                    {this.state.error.stack}
                                </p>
                            </div>
                        )}
                    </motion.div>
                </div>
            );
        }

        return this.props.children;
    }
}
