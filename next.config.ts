import type {NextConfig} from 'next';

const nextConfig:NextConfig={
  // This only affects local development. The indicator is never shipped in a production build.
  devIndicators:false,
};

export default nextConfig;
