"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";

export default function HomePage() {
  const { data: session, status } = useSession();

  return (
    <>
      <div className="absolute right-4 top-4"></div>
      <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
        <h1 className="text-5xl font-extrabold tracking-tight sm:text-[5rem]">
          Create <span className="text-secondary">T3</span> App
        </h1>
        {status === "loading" ? (
          <div>Loading session...</div>
        ) : session ? (
          <div className="rounded-lg bg-black/10 p-4">
            <h2 className="mb-2 text-xl font-bold">Session Data:</h2>
            <pre className="text-sm">{JSON.stringify(session, null, 2)}</pre>
            <h2 className="mb-2 mt-4 text-xl font-bold">User Data:</h2>
            <pre className="text-sm">
              {JSON.stringify(session.user, null, 2)}
            </pre>
          </div>
        ) : (
          <div>Not signed in</div>
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-8">
          <Link
            className="flex max-w-xs flex-col gap-4 rounded-xl bg-black/10 p-4 hover:bg-white/20"
            href="https://create.t3.gg/en/usage/first-steps"
            target="_blank"
          >
            <h3 className="text-2xl font-bold">First Steps →</h3>
            <div className="text-lg">
              Just the basics - Everything you need to know to set up your
              database and authentication.
            </div>
          </Link>
          <Link
            className="flex max-w-xs flex-col gap-4 rounded-xl bg-black/10 p-4 hover:bg-white/20"
            href="https://create.t3.gg/en/introduction"
            target="_blank"
          >
            <h3 className="text-2xl font-bold">Documentation →</h3>
            <div className="text-lg">
              Learn more about Create T3 App, the libraries it uses, and how to
              deploy it.
            </div>
          </Link>
        </div>
      </div>
    </>
  );
}
