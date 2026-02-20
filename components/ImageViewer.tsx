"use client";

import React, { useEffect, useRef, useState } from "react";
import Swal from "sweetalert2";

interface ImageViewerProps {
  src: string;
  name?: string;
  tabId?: string;
  initialData?: any;
  onClose?: () => void;
}

export default function ImageViewer({
  src,
  name = "Image",
  tabId,
  initialData,
  onClose,
}: ImageViewerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isPhotopeaLoaded, setIsPhotopeaLoaded] = useState(false);

  // Configuration for Photopea
  // We use the URL hash to set the environment, but we'll send the image via postMessage
  const photopeaConfig = {
    environment: {
      theme: 0, // 0: Silver (White)
      lang: "en",
      vmode: 0, // View mode: 0: Auto (Full Editor), 1: Png tool, 2: Alpha tool
      intro: false, // Skip intro screen
      custom: {
        // Force reset UI elements to default
        "tools": true,
        "side": true,
        "bot": true,
        "top": true
      }
    },
  };
  const photopeaUrl = `https://www.photopea.com#${encodeURI(JSON.stringify(photopeaConfig))}`;

  // 1. Load the image and send it to Photopea via postMessage
  useEffect(() => {
    const loadAndSendImage = async () => {
      if (!iframeRef.current || !src || !isPhotopeaLoaded) return;

      try {
        // Fetch the image to get it as a Blob/ArrayBuffer
        // This works for both remote URLs (if CORS allows) and Data URLs
        const response = await fetch(src);
        const blob = await response.blob();
        const buffer = await blob.arrayBuffer();

        // Send the ArrayBuffer to Photopea
        // Photopea recognizes ArrayBuffer as a file to open
        iframeRef.current.contentWindow?.postMessage(buffer, "*");
      } catch (error) {
        console.error("Failed to load image for Photopea:", error);
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "Gagal memuat gambar ke Photopea.",
        });
      }
    };

    loadAndSendImage();
  }, [src, isPhotopeaLoaded]);

  // 2. Handle Messages from Photopea (Saving)
  useEffect(() => {
    const handleMessage = async (e: MessageEvent) => {
      // Photopea sends the saved file as an ArrayBuffer when we call saveToOE
      if (e.data instanceof ArrayBuffer) {
        try {
          // Convert ArrayBuffer back to Data URL
          const blob = new Blob([e.data], { type: "image/png" });
          const reader = new FileReader();
          reader.onload = () => {
            const newSrc = reader.result as string;

            // Dispatch update event
            if (initialData?.sourceTabId && initialData?.cardId) {
              window.dispatchEvent(
                new CustomEvent("update-card-image", {
                  detail: {
                    tabId: initialData.sourceTabId,
                    cardId: initialData.cardId,
                    newImageSrc: newSrc,
                  },
                }),
              );

              Swal.fire({
                icon: "success",
                title: "Tersimpan!",
                text: "Gambar berhasil diperbarui dari Photopea.",
                timer: 1500,
                showConfirmButton: false,
              }).then(() => {
                onClose?.();
              });
            } else {
              Swal.fire({
                icon: "error",
                title: "Error",
                text: "Informasi kartu sumber hilang.",
              });
            }
          };
          reader.readAsDataURL(blob);
        } catch (error) {
          console.error("Error processing saved image:", error);
        }
      } else if (typeof e.data === "string") {
         // Log messages from Photopea if needed (e.g. "done")
         // console.log("Photopea message:", e.data);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [initialData, onClose]);

  // 3. Handle Save Trigger from Navbar or Shortcut
  const triggerSave = () => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      // Script to tell Photopea to export the current document as PNG and send it back
      // saveToOE format: "format" (e.g. "png", "jpg", "psd")
      const script = "app.activeDocument.saveToOE('png');";
      iframeRef.current.contentWindow.postMessage(script, "*");
    }
  };

  // Listen to Navbar events & Keyboard Shortcuts
  useEffect(() => {
    const handleSaveEvent = (e: CustomEvent) => {
      if (e.detail?.tabId === tabId) {
        triggerSave();
      }
    };

    const handleCloseEvent = (e: CustomEvent) => {
      if (e.detail?.tabId === tabId) {
        onClose?.();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+S to Save
      if (e.ctrlKey && (e.key === "s" || e.key === "S")) {
        e.preventDefault();
        triggerSave();
      }
      // Esc to Close
      if (e.key === "Escape") {
        e.preventDefault();
        onClose?.();
      }
    };

    window.addEventListener(
      "save-image-edit",
      handleSaveEvent as EventListener,
    );
    window.addEventListener(
      "close-image-tab",
      handleCloseEvent as EventListener,
    );
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener(
        "save-image-edit",
        handleSaveEvent as EventListener,
      );
      window.removeEventListener(
        "close-image-tab",
        handleCloseEvent as EventListener,
      );
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [tabId, onClose]);

  return (
    <div className="relative w-full h-full bg-white">
      <iframe
        ref={iframeRef}
        src={photopeaUrl}
        className="w-full h-full border-0"
        onLoad={() => setIsPhotopeaLoaded(true)}
        allow="clipboard-read; clipboard-write" // Important for copy-paste inside Photopea
        title="Photopea Editor"
      />
      
      {/* Loading Overlay until Photopea is ready */}
      {!isPhotopeaLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-white text-gray-800">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500 mx-auto mb-4"></div>
            <p className="text-orange-500 font-medium">Loading Photopea...</p>
          </div>
        </div>
      )}
    </div>
  );
}
