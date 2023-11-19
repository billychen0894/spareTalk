"use client";
import Spline from "@splinetool/react-spline";

export default function Sunset() {
  // TODO: Consider lazy loading splinetool after first page load

  return (
    <div className="h-screen w-screen fixed top-0 left-0 -z-10">
      <Spline scene="https://prod.spline.design/sS93Zv4Fmn9EuE8J/scene.splinecode" />
    </div>
  );
}
