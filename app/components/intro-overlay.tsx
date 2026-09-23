"use client";

import { useEffect, useState } from "react";

// Combined logo mark reveal + shuttle flight, ~6s total:
//   0-0.3s   → forest overlay in
//   0.3-1.7s → KBC crest scales/rotates into place from tiny + off-axis
//   0.5-1.8s → radial glow behind logo fades in
//   1.8-2.8s → bright shine streak sweeps across the crest
//   2.2-2.9s → "Knocklyon Badminton Club" wordmark fades in near the bottom
//   2.7-4.7s → shuttle enters top-right, curved flight, lands on cork
//   4.7-5.2s → impact flash + crest punch (bounce + glow bloom)
//   5.1-6.0s → whole overlay fades out to reveal the site
const TOTAL_MS = 6000;

export default function IntroOverlay({ nonce = 0 }: { nonce?: number }) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Reset on nonce bump (used by the preview switcher to replay); the
    // dismissal timer then runs once. Both setState calls are one-shot.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDismissed(false);
    const t = setTimeout(() => setDismissed(true), TOTAL_MS);
    return () => clearTimeout(t);
  }, [nonce]);

  if (dismissed) return null;

  return (
    <div
      key={nonce}
      className="launch-overlay fixed inset-0 z-[9990] flex items-center justify-center bg-forest overflow-hidden"
      aria-hidden="true"
    >
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="absolute top-5 right-5 z-30 rounded border border-white/30 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/90 backdrop-blur hover:bg-white/20"
      >
        Skip →
      </button>

      {/* Radial glow behind the logo — fades in with the crest */}
      <div className="launch-glow absolute w-[600px] h-[600px] rounded-full pointer-events-none" />

      {/* Logo + shuttle target live in this positioning box so the shuttle
          can land on the drawn cork rather than the crest's geometric centre.
          Tweak --cork-x / --cork-y (percentages of the logo image) to nudge. */}
      <div
        className="launch-logo relative"
        style={{ ["--cork-x" as string]: "54%", ["--cork-y" as string]: "32%" }}
      >
        {/* Logo image gets the scale/rotate reveal and the landing punch. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/kbc-logo.png"
          alt=""
          className="launch-crest h-40 w-auto sm:h-56 relative z-10"
        />

        {/* Shine sweep — a diagonal white streak that translates across the crest */}
        <div className="launch-shine absolute inset-0 z-20 pointer-events-none" />

        {/* Zero-size anchor placed exactly at the cork on the logo.
            Any transform on .launch-shuttle-wrap happens around this point. */}
        <div className="launch-shuttle-wrap absolute pointer-events-none">
          {/* Inner shift so the SVG's own cork (~137, ~101 in CSS px)
              sits at the wrap's origin — that way scale/rotate keep it pinned. */}
          <div className="launch-shuttle-inner">
            <ShuttleSVG />
          </div>
        </div>

        {/* Impact flash pops from the same cork point. */}
        <div className="launch-flash absolute rounded-full bg-white pointer-events-none" />
      </div>

      {/* Wordmark anchored near the bottom of the viewport */}
      <p className="launch-word absolute bottom-[20%] text-xs font-semibold uppercase tracking-[0.4em] text-white/85">
        Knocklyon Badminton Club
      </p>

      <style
        dangerouslySetInnerHTML={{
          __html: `
            .launch-overlay { animation: launch-overlay-fade 0.9s ease-out 5.1s forwards; }

            /* Logo scale-in reveal, then a bounce/punch when the shuttle lands. */
            .launch-crest {
              transform: scale(0.1) rotate(-14deg);
              opacity: 0;
              animation:
                launch-mark-appear 1.4s cubic-bezier(0.2, 1.15, 0.4, 1) 0.3s forwards,
                launch-mark-punch 0.5s cubic-bezier(0.4, 0, 0.2, 1) 4.7s;
              filter: drop-shadow(0 0 20px rgba(255,255,255,0.15));
              will-change: transform, opacity, filter;
            }

            /* Soft green halo behind the logo. */
            .launch-glow {
              background: radial-gradient(circle, rgba(27, 94, 53, 0.5) 0%, rgba(0,0,0,0) 65%);
              opacity: 0;
              animation:
                launch-glow-in 1.3s ease-out 0.5s forwards,
                launch-glow-bloom 0.5s ease-out 4.7s forwards;
            }

            /* Diagonal sheen sweeping left-to-right across the logo. */
            .launch-shine {
              background: linear-gradient(115deg,
                transparent 40%,
                rgba(255,255,255,0.85) 50%,
                transparent 60%);
              mix-blend-mode: overlay;
              transform: translateX(-160%) skewX(-8deg);
              opacity: 0;
              animation: launch-shine-sweep 1s cubic-bezier(0.45, 0.05, 0.55, 0.95) 1.8s forwards;
            }

            .launch-word {
              opacity: 0;
              animation: launch-word-in 0.7s ease-out 2.2s forwards;
            }

            /* Zero-size anchor pinned to the cork position on the logo image.
               transform-origin: 0 0 means all rotation/scale happens around
               this exact pixel, so the shuttle always lands on the cork
               regardless of scale. */
            .launch-shuttle-wrap {
              top: var(--cork-y);
              left: var(--cork-x);
              width: 0;
              height: 0;
              transform-origin: 0 0;
              transform: translate(60vw, -60vh) rotate(-30deg) scale(0.35);
              opacity: 0;
              animation: launch-shuttle-fly 2s cubic-bezier(0.4, 0, 0.2, 1) 2.7s forwards;
              filter: drop-shadow(0 10px 30px rgba(0,0,0,0.35));
              z-index: 15;
            }
            /* Shift the SVG so its own cork (~137px, ~101px in CSS after
               the 160px width scaling of viewBox "87 62 546 427") sits at
               the wrap origin. */
            .launch-shuttle-inner { transform: translate(-137px, -101px); }

            .launch-flash {
              top: var(--cork-y);
              left: var(--cork-x);
              width: 20px; height: 20px;
              transform: translate(-50%, -50%) scale(0);
              opacity: 0;
              animation: launch-flash-pop 0.6s ease-out 4.7s forwards;
              mix-blend-mode: screen;
              z-index: 25;
            }

            @keyframes launch-mark-appear {
              0%   { transform: scale(0.1) rotate(-14deg); opacity: 0; }
              60%  { transform: scale(1.08) rotate(3deg);  opacity: 1; }
              100% { transform: scale(1) rotate(0deg);     opacity: 1; }
            }
            @keyframes launch-mark-punch {
              0%   { transform: scale(1); filter: drop-shadow(0 0 20px rgba(255,255,255,0.15)); }
              45%  { transform: scale(1.08); filter: drop-shadow(0 0 45px rgba(255,255,255,0.35)); }
              100% { transform: scale(1); filter: drop-shadow(0 0 20px rgba(255,255,255,0.15)); }
            }
            @keyframes launch-glow-in    { to { opacity: 1; } }
            @keyframes launch-glow-bloom { to { opacity: 1; transform: scale(1.15); } }
            @keyframes launch-shine-sweep {
              0%   { transform: translateX(-160%) skewX(-8deg); opacity: 0; }
              15%  { opacity: 1; }
              85%  { opacity: 1; }
              100% { transform: translateX(160%) skewX(-8deg);  opacity: 0; }
            }
            @keyframes launch-word-in { to { opacity: 1; } }
            @keyframes launch-shuttle-fly {
              /* SVG is drawn already tilted (feathers upper-left, cork
                 lower-right) so landing rotation is 0. Entry has extra spin. */
              0%   { transform: translate(60vw, -60vh) rotate(-30deg) scale(0.35); opacity: 0; }
              8%   { opacity: 1; }
              78%  { transform: translate(0, 0) rotate(0deg) scale(0.72); opacity: 1; }
              100% { transform: translate(0, 0) rotate(0deg) scale(0.6);  opacity: 0; }
            }
            @keyframes launch-flash-pop {
              0%   { transform: translate(-50%, -50%) scale(0); opacity: 0.9; }
              100% { transform: translate(-50%, -50%) scale(28); opacity: 0; }
            }
            @keyframes launch-overlay-fade {
              0%   { opacity: 1; }
              100% { opacity: 0; visibility: hidden; pointer-events: none; }
            }

            @media (prefers-reduced-motion: reduce) {
              .launch-overlay { animation: launch-overlay-fade 0.4s ease-out 0.6s forwards; }
              .launch-crest { transform: none; opacity: 1; animation: none; filter: none; }
              .launch-glow, .launch-shine, .launch-shuttle-wrap, .launch-flash { display: none; }
              .launch-word { opacity: 1; animation: none; }
            }
          `,
        }}
      />
    </div>
  );
}

// Traced from the shuttle drawn inside the KBC logo. Drawn already tilted
// (feathers upper-left, cork lower-right) so the flight animation lands
// with rotate(0). Cork centre sits at SVG coord (~555, 407). At the
// rendered width of 160px (viewBox "87 62 546 427") that maps to CSS
// pixel (137, 101) — used by .launch-shuttle-inner to pin the cork to
// the wrap origin.
function ShuttleSVG() {
  return (
    <svg
      width="160"
      viewBox="87 62 546 427"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block" }}
    >
      <g fill="#ffffff" fillRule="evenodd">
        <path d="M 552 338 L 551 339 L 551 340 L 550 341 L 550 342 L 549 343 L 549 344 L 548 345 L 548 346 L 547 347 L 547 348 L 546 349 L 546 350 L 545 351 L 544 354 L 542 356 L 542 357 L 541 358 L 541 359 L 540 360 L 540 361 L 539 362 L 539 363 L 538 364 L 538 365 L 537 366 L 537 367 L 536 368 L 536 369 L 535 370 L 535 371 L 534 372 L 534 373 L 533 374 L 532 377 L 530 379 L 530 380 L 529 381 L 529 382 L 528 383 L 528 384 L 527 385 L 527 386 L 526 387 L 526 388 L 525 389 L 525 390 L 524 391 L 524 392 L 523 393 L 523 394 L 522 395 L 522 396 L 521 397 L 521 398 L 520 399 L 519 402 L 517 404 L 517 405 L 516 406 L 516 407 L 515 408 L 515 409 L 514 410 L 514 411 L 513 412 L 513 413 L 512 414 L 512 415 L 511 416 L 511 417 L 510 418 L 510 419 L 509 420 L 509 421 L 508 422 L 508 423 L 507 424 L 506 427 L 504 429 L 504 430 L 503 431 L 503 432 L 502 433 L 502 434 L 501 435 L 501 436 L 500 437 L 500 438 L 499 439 L 499 440 L 498 441 L 498 442 L 497 443 L 497 444 L 496 445 L 496 446 L 493 451 L 494 451 L 496 453 L 497 453 L 498 454 L 499 454 L 500 455 L 501 455 L 502 456 L 503 456 L 504 457 L 505 457 L 506 458 L 507 458 L 508 459 L 509 459 L 510 460 L 511 460 L 512 461 L 513 461 L 514 462 L 515 462 L 516 463 L 519 464 L 521 466 L 522 466 L 523 467 L 524 467 L 525 468 L 526 468 L 531 471 L 533 471 L 534 472 L 536 472 L 537 473 L 539 473 L 540 474 L 542 474 L 543 475 L 547 475 L 548 476 L 554 476 L 555 477 L 561 477 L 562 476 L 564 476 L 565 475 L 568 475 L 569 474 L 571 474 L 572 473 L 575 473 L 576 472 L 578 472 L 579 471 L 582 471 L 583 470 L 584 470 L 587 467 L 588 467 L 593 462 L 594 462 L 599 457 L 600 457 L 605 452 L 606 452 L 608 450 L 608 449 L 610 447 L 610 446 L 611 445 L 611 444 L 612 443 L 612 442 L 613 441 L 613 440 L 614 439 L 614 438 L 617 433 L 617 431 L 618 430 L 618 428 L 619 427 L 619 424 L 620 423 L 620 419 L 621 418 L 621 402 L 620 401 L 620 397 L 619 396 L 619 394 L 618 393 L 618 391 L 617 390 L 617 388 L 616 387 L 615 384 L 613 382 L 612 379 L 593 360 L 592 360 L 589 357 L 588 357 L 586 355 L 585 355 L 584 354 L 583 354 L 582 353 L 581 353 L 580 352 L 579 352 L 578 351 L 577 351 L 576 350 L 575 350 L 574 349 L 573 349 L 572 348 L 571 348 L 570 347 L 569 347 L 568 346 L 567 346 L 566 345 L 563 344 L 561 342 L 560 342 L 559 341 L 558 341 L 557 340 L 556 340 L 555 339 Z" />
        <path d="M 526 324 L 525 325 L 525 326 L 524 327 L 524 328 L 523 329 L 523 330 L 522 331 L 522 332 L 521 333 L 521 334 L 520 335 L 520 336 L 519 337 L 519 338 L 518 339 L 518 340 L 517 341 L 517 342 L 516 343 L 516 344 L 515 345 L 514 348 L 512 350 L 512 351 L 511 352 L 511 353 L 510 354 L 510 355 L 509 356 L 509 357 L 508 358 L 508 359 L 507 360 L 507 361 L 506 362 L 506 363 L 505 364 L 505 365 L 504 366 L 504 367 L 503 368 L 502 371 L 500 373 L 500 374 L 499 375 L 499 376 L 498 377 L 498 378 L 497 379 L 497 380 L 496 381 L 496 382 L 495 383 L 495 384 L 494 385 L 494 386 L 493 387 L 493 388 L 492 389 L 492 390 L 491 391 L 491 392 L 490 393 L 489 396 L 487 398 L 487 399 L 486 400 L 486 401 L 485 402 L 485 403 L 484 404 L 484 405 L 483 406 L 483 407 L 482 408 L 482 409 L 481 410 L 481 411 L 480 412 L 480 413 L 479 414 L 479 415 L 478 416 L 478 417 L 477 418 L 476 421 L 474 423 L 474 424 L 473 425 L 473 426 L 472 427 L 472 428 L 471 429 L 471 430 L 470 431 L 470 432 L 467 437 L 468 438 L 471 439 L 473 441 L 474 441 L 475 442 L 476 442 L 481 445 L 483 445 L 484 444 L 484 443 L 485 442 L 485 441 L 486 440 L 486 439 L 487 438 L 487 437 L 488 436 L 488 435 L 489 434 L 489 433 L 490 432 L 490 431 L 491 430 L 491 429 L 492 428 L 492 427 L 493 426 L 493 425 L 494 424 L 495 421 L 497 419 L 497 418 L 498 417 L 498 416 L 499 415 L 499 414 L 500 413 L 500 412 L 501 411 L 501 410 L 502 409 L 502 408 L 503 407 L 503 406 L 504 405 L 504 404 L 505 403 L 505 402 L 506 401 L 506 400 L 507 399 L 508 396 L 510 394 L 510 393 L 511 392 L 511 391 L 512 390 L 512 389 L 513 388 L 513 387 L 514 386 L 514 385 L 515 384 L 515 383 L 516 382 L 516 381 L 517 380 L 517 379 L 518 378 L 518 377 L 519 376 L 520 373 L 522 371 L 522 370 L 523 369 L 523 368 L 524 367 L 524 366 L 525 365 L 525 364 L 526 363 L 526 362 L 527 361 L 527 360 L 528 359 L 528 358 L 529 357 L 529 356 L 530 355 L 530 354 L 531 353 L 531 352 L 532 351 L 533 348 L 535 346 L 535 345 L 536 344 L 536 343 L 537 342 L 537 341 L 538 340 L 538 339 L 541 334 L 541 332 L 538 331 L 536 329 L 535 329 L 534 328 L 533 328 L 532 327 L 531 327 Z" />
        <path d="M 243 74 L 243 76 L 244 77 L 244 79 L 245 80 L 245 83 L 246 84 L 246 86 L 247 87 L 247 89 L 248 90 L 248 92 L 249 93 L 249 95 L 250 96 L 250 99 L 251 100 L 251 102 L 252 103 L 252 105 L 253 106 L 253 108 L 254 109 L 254 111 L 255 112 L 255 115 L 256 116 L 256 118 L 257 119 L 257 121 L 258 122 L 258 124 L 259 125 L 259 127 L 260 128 L 260 131 L 263 134 L 264 134 L 269 139 L 270 139 L 274 143 L 275 143 L 279 147 L 280 147 L 284 151 L 285 151 L 289 155 L 290 155 L 294 159 L 295 159 L 299 163 L 300 163 L 304 167 L 305 167 L 309 171 L 310 171 L 314 175 L 315 175 L 319 179 L 320 179 L 324 183 L 325 183 L 329 187 L 330 187 L 334 191 L 335 191 L 339 195 L 340 195 L 344 199 L 344 200 L 342 202 L 341 202 L 338 205 L 337 205 L 335 203 L 334 203 L 325 195 L 324 195 L 321 192 L 320 192 L 316 188 L 315 188 L 311 184 L 310 184 L 307 181 L 306 181 L 297 173 L 296 173 L 293 170 L 292 170 L 283 162 L 282 162 L 279 159 L 278 159 L 269 151 L 268 151 L 265 148 L 264 148 L 255 140 L 246 140 L 245 139 L 228 139 L 227 138 L 210 138 L 209 137 L 193 137 L 192 136 L 193 137 L 193 138 L 194 139 L 194 140 L 197 145 L 197 147 L 198 148 L 198 149 L 199 150 L 199 151 L 200 152 L 200 153 L 201 154 L 201 155 L 202 156 L 202 157 L 203 158 L 203 159 L 204 160 L 204 161 L 205 162 L 205 163 L 206 164 L 206 165 L 207 166 L 207 167 L 208 168 L 208 169 L 209 170 L 209 171 L 210 172 L 210 173 L 211 174 L 211 175 L 212 176 L 212 177 L 213 178 L 213 179 L 214 180 L 214 181 L 215 182 L 215 183 L 216 184 L 216 185 L 217 186 L 217 187 L 218 188 L 219 191 L 222 194 L 225 195 L 227 197 L 230 198 L 232 200 L 235 201 L 237 203 L 240 204 L 242 206 L 245 207 L 247 209 L 250 210 L 252 212 L 255 213 L 257 215 L 260 216 L 262 218 L 265 219 L 267 221 L 270 222 L 272 224 L 273 224 L 274 225 L 275 225 L 277 227 L 280 228 L 282 230 L 283 230 L 285 232 L 288 233 L 290 235 L 293 236 L 298 240 L 293 245 L 292 245 L 290 243 L 287 242 L 285 240 L 284 240 L 283 239 L 280 238 L 278 236 L 275 235 L 273 233 L 272 233 L 271 232 L 268 231 L 266 229 L 263 228 L 261 226 L 260 226 L 259 225 L 256 224 L 254 222 L 251 221 L 249 219 L 248 219 L 247 218 L 244 217 L 242 215 L 239 214 L 237 212 L 236 212 L 235 211 L 232 210 L 230 208 L 227 207 L 225 205 L 224 205 L 223 204 L 220 203 L 218 201 L 217 201 L 214 199 L 211 199 L 210 200 L 194 200 L 193 201 L 177 201 L 176 202 L 161 202 L 160 203 L 155 203 L 156 206 L 158 208 L 159 211 L 161 213 L 161 214 L 162 215 L 162 216 L 164 218 L 165 221 L 169 226 L 170 229 L 172 231 L 173 234 L 175 236 L 175 237 L 176 238 L 176 239 L 178 241 L 179 244 L 183 249 L 184 252 L 187 255 L 188 255 L 191 257 L 193 257 L 198 260 L 200 260 L 201 261 L 202 261 L 207 264 L 209 264 L 214 267 L 216 267 L 217 268 L 218 268 L 223 271 L 225 271 L 230 274 L 232 274 L 237 277 L 239 277 L 240 278 L 241 278 L 246 281 L 248 281 L 253 284 L 255 284 L 257 286 L 257 287 L 256 288 L 256 289 L 253 292 L 253 293 L 252 294 L 251 294 L 250 293 L 248 293 L 247 292 L 246 292 L 241 289 L 239 289 L 238 288 L 237 288 L 232 285 L 230 285 L 229 284 L 228 284 L 223 281 L 221 281 L 220 280 L 219 280 L 214 277 L 212 277 L 211 276 L 210 276 L 205 273 L 203 273 L 202 272 L 201 272 L 196 269 L 194 269 L 193 268 L 192 268 L 187 265 L 185 265 L 182 263 L 177 263 L 176 264 L 171 264 L 170 265 L 165 265 L 164 266 L 160 266 L 159 267 L 154 267 L 153 268 L 149 268 L 148 269 L 143 269 L 142 270 L 137 270 L 136 271 L 132 271 L 131 272 L 126 272 L 125 273 L 121 273 L 123 275 L 123 276 L 127 280 L 127 281 L 131 285 L 131 286 L 134 289 L 134 290 L 138 294 L 138 295 L 142 299 L 142 300 L 146 304 L 146 305 L 149 308 L 149 309 L 153 313 L 153 314 L 157 318 L 157 319 L 160 322 L 162 322 L 163 323 L 165 323 L 166 324 L 168 324 L 169 325 L 172 325 L 173 326 L 175 326 L 176 327 L 178 327 L 179 328 L 182 328 L 183 329 L 185 329 L 186 330 L 188 330 L 189 331 L 192 331 L 193 332 L 195 332 L 196 333 L 198 333 L 199 334 L 202 334 L 203 335 L 205 335 L 206 336 L 208 336 L 209 337 L 211 337 L 212 338 L 215 338 L 216 339 L 218 339 L 219 340 L 220 340 L 221 341 L 221 342 L 220 343 L 220 344 L 219 345 L 218 348 L 217 349 L 214 349 L 213 348 L 211 348 L 210 347 L 208 347 L 207 346 L 204 346 L 203 345 L 201 345 L 200 344 L 197 344 L 196 343 L 194 343 L 193 342 L 190 342 L 189 341 L 187 341 L 186 340 L 184 340 L 183 339 L 180 339 L 179 338 L 177 338 L 176 337 L 173 337 L 172 336 L 170 336 L 169 335 L 166 335 L 165 334 L 163 334 L 162 333 L 160 333 L 159 332 L 155 332 L 154 333 L 152 333 L 151 334 L 148 334 L 147 335 L 145 335 L 144 336 L 142 336 L 141 337 L 139 337 L 138 338 L 136 338 L 135 339 L 133 339 L 132 340 L 130 340 L 129 341 L 126 341 L 125 342 L 123 342 L 122 343 L 120 343 L 119 344 L 117 344 L 116 345 L 114 345 L 113 346 L 111 346 L 110 347 L 108 347 L 107 348 L 104 348 L 103 349 L 101 349 L 100 350 L 99 350 L 116 367 L 117 367 L 143 393 L 146 393 L 147 394 L 153 394 L 154 395 L 159 395 L 160 396 L 166 396 L 167 397 L 172 397 L 173 398 L 179 398 L 180 399 L 185 399 L 186 400 L 191 400 L 193 402 L 196 402 L 197 403 L 202 403 L 203 404 L 209 404 L 210 405 L 213 405 L 214 404 L 217 404 L 218 405 L 224 405 L 225 406 L 230 406 L 231 407 L 237 407 L 238 408 L 243 408 L 244 409 L 250 409 L 251 410 L 256 410 L 257 411 L 263 411 L 264 412 L 269 412 L 270 413 L 276 413 L 277 414 L 282 414 L 283 415 L 288 415 L 289 416 L 294 416 L 295 415 L 297 415 L 298 414 L 300 414 L 301 413 L 303 413 L 304 412 L 306 412 L 307 411 L 309 411 L 310 410 L 313 410 L 314 409 L 316 409 L 317 408 L 319 408 L 320 407 L 322 407 L 323 406 L 329 406 L 330 407 L 334 407 L 335 408 L 339 408 L 340 409 L 344 409 L 345 410 L 348 410 L 349 411 L 353 411 L 354 412 L 358 412 L 359 413 L 363 413 L 364 414 L 378 414 L 379 415 L 381 415 L 382 416 L 384 416 L 385 417 L 387 417 L 388 418 L 390 418 L 391 419 L 393 419 L 394 420 L 396 420 L 397 421 L 401 421 L 402 422 L 406 422 L 407 423 L 411 423 L 412 424 L 416 424 L 417 425 L 420 425 L 421 426 L 425 426 L 426 427 L 430 427 L 431 428 L 435 428 L 436 429 L 440 429 L 441 430 L 444 430 L 445 431 L 449 431 L 450 432 L 454 432 L 455 433 L 459 433 L 460 434 L 461 434 L 464 429 L 464 428 L 463 427 L 459 427 L 458 426 L 455 426 L 454 425 L 451 425 L 450 424 L 447 424 L 446 423 L 442 423 L 441 422 L 438 422 L 437 421 L 434 421 L 433 420 L 430 420 L 429 419 L 425 419 L 424 418 L 421 418 L 420 417 L 417 417 L 416 416 L 413 416 L 412 415 L 408 415 L 407 414 L 404 414 L 403 413 L 400 413 L 399 412 L 396 412 L 395 411 L 391 411 L 390 410 L 387 410 L 386 409 L 383 409 L 382 408 L 379 408 L 378 407 L 374 407 L 373 406 L 370 406 L 369 405 L 366 405 L 365 404 L 362 404 L 361 403 L 357 403 L 356 402 L 353 402 L 352 401 L 349 401 L 348 400 L 344 400 L 343 399 L 340 399 L 339 398 L 336 398 L 335 397 L 332 397 L 331 396 L 330 396 L 326 392 L 325 392 L 320 387 L 319 387 L 308 377 L 307 377 L 305 375 L 304 375 L 303 374 L 300 374 L 299 373 L 297 373 L 296 372 L 293 372 L 292 371 L 290 371 L 289 370 L 287 370 L 286 369 L 283 369 L 282 368 L 280 368 L 279 367 L 276 367 L 275 366 L 273 366 L 272 365 L 269 365 L 268 364 L 266 364 L 265 363 L 263 363 L 262 362 L 259 362 L 258 361 L 256 361 L 255 360 L 252 360 L 251 359 L 249 359 L 248 358 L 245 358 L 244 357 L 242 357 L 241 356 L 238 356 L 235 354 L 235 353 L 236 352 L 236 351 L 237 350 L 238 347 L 239 346 L 241 346 L 242 347 L 245 347 L 246 348 L 248 348 L 249 349 L 251 349 L 252 350 L 254 350 L 255 351 L 258 351 L 259 352 L 261 352 L 262 353 L 264 353 L 265 354 L 268 354 L 269 355 L 271 355 L 272 356 L 274 356 L 275 357 L 278 357 L 279 358 L 281 358 L 282 359 L 284 359 L 285 360 L 288 360 L 289 361 L 291 361 L 292 362 L 294 362 L 295 363 L 298 363 L 299 364 L 301 364 L 302 365 L 304 365 L 305 366 L 307 366 L 308 367 L 314 367 L 315 366 L 319 366 L 320 365 L 325 365 L 326 364 L 330 364 L 331 363 L 336 363 L 337 362 L 341 362 L 342 361 L 345 361 L 346 362 L 348 362 L 351 364 L 353 364 L 354 365 L 356 365 L 357 366 L 359 366 L 360 367 L 362 367 L 363 368 L 365 368 L 368 370 L 370 370 L 371 371 L 373 371 L 374 372 L 376 372 L 377 373 L 379 373 L 380 374 L 382 374 L 385 376 L 387 376 L 388 377 L 390 377 L 391 378 L 393 378 L 394 379 L 396 379 L 397 380 L 399 380 L 402 382 L 404 382 L 405 383 L 407 383 L 408 384 L 410 384 L 411 385 L 413 385 L 414 386 L 416 386 L 419 388 L 421 388 L 422 389 L 424 389 L 425 390 L 427 390 L 428 391 L 430 391 L 431 392 L 433 392 L 436 394 L 438 394 L 439 395 L 441 395 L 442 396 L 444 396 L 445 397 L 447 397 L 448 398 L 450 398 L 453 400 L 455 400 L 456 401 L 458 401 L 459 402 L 461 402 L 462 403 L 464 403 L 467 405 L 469 405 L 470 406 L 472 406 L 473 407 L 475 407 L 478 402 L 478 401 L 477 400 L 475 400 L 474 399 L 472 399 L 471 398 L 470 398 L 469 397 L 467 397 L 464 395 L 462 395 L 461 394 L 459 394 L 456 392 L 454 392 L 453 391 L 451 391 L 448 389 L 446 389 L 445 388 L 443 388 L 440 386 L 438 386 L 437 385 L 435 385 L 434 384 L 433 384 L 432 383 L 430 383 L 427 381 L 425 381 L 424 380 L 422 380 L 419 378 L 417 378 L 416 377 L 414 377 L 411 375 L 409 375 L 408 374 L 406 374 L 403 372 L 401 372 L 400 371 L 398 371 L 397 370 L 396 370 L 395 369 L 393 369 L 390 367 L 388 367 L 387 366 L 385 366 L 382 364 L 380 364 L 379 363 L 377 363 L 374 361 L 372 361 L 371 360 L 369 360 L 366 358 L 364 358 L 363 357 L 361 357 L 358 355 L 356 355 L 353 353 L 351 353 L 346 348 L 346 347 L 335 336 L 335 335 L 328 328 L 327 328 L 322 325 L 320 325 L 319 324 L 318 324 L 313 321 L 311 321 L 310 320 L 309 320 L 304 317 L 302 317 L 301 316 L 300 316 L 295 313 L 293 313 L 292 312 L 291 312 L 286 309 L 284 309 L 283 308 L 282 308 L 277 305 L 275 305 L 274 304 L 273 304 L 268 301 L 268 300 L 269 299 L 269 298 L 271 296 L 271 295 L 273 293 L 275 293 L 278 295 L 280 295 L 285 298 L 287 298 L 292 301 L 294 301 L 295 302 L 296 302 L 301 305 L 303 305 L 308 308 L 310 308 L 311 309 L 312 309 L 317 312 L 319 312 L 324 315 L 326 315 L 327 316 L 328 316 L 331 318 L 333 318 L 334 319 L 368 319 L 369 320 L 370 320 L 371 321 L 372 321 L 373 322 L 374 322 L 375 323 L 376 323 L 377 324 L 378 324 L 379 325 L 382 326 L 384 328 L 385 328 L 386 329 L 387 329 L 388 330 L 389 330 L 390 331 L 391 331 L 392 332 L 393 332 L 394 333 L 395 333 L 396 334 L 397 334 L 398 335 L 399 335 L 400 336 L 401 336 L 402 337 L 403 337 L 404 338 L 405 338 L 406 339 L 407 339 L 408 340 L 409 340 L 410 341 L 411 341 L 412 342 L 413 342 L 414 343 L 415 343 L 416 344 L 417 344 L 418 345 L 419 345 L 420 346 L 421 346 L 422 347 L 423 347 L 424 348 L 425 348 L 426 349 L 427 349 L 428 350 L 429 350 L 430 351 L 431 351 L 432 352 L 433 352 L 434 353 L 435 353 L 436 354 L 437 354 L 438 355 L 439 355 L 440 356 L 441 356 L 442 357 L 443 357 L 444 358 L 445 358 L 446 359 L 447 359 L 448 360 L 449 360 L 450 361 L 451 361 L 452 362 L 453 362 L 454 363 L 455 363 L 456 364 L 457 364 L 458 365 L 459 365 L 460 366 L 461 366 L 462 367 L 463 367 L 464 368 L 465 368 L 466 369 L 467 369 L 468 370 L 469 370 L 470 371 L 471 371 L 472 372 L 473 372 L 474 373 L 475 373 L 476 374 L 477 374 L 478 375 L 479 375 L 480 376 L 481 376 L 482 377 L 483 377 L 484 378 L 485 378 L 486 379 L 489 380 L 490 379 L 490 378 L 491 377 L 492 374 L 491 374 L 490 373 L 489 373 L 488 372 L 485 371 L 483 369 L 482 369 L 481 368 L 480 368 L 479 367 L 478 367 L 477 366 L 474 365 L 472 363 L 471 363 L 470 362 L 469 362 L 468 361 L 467 361 L 466 360 L 465 360 L 464 359 L 461 358 L 459 356 L 458 356 L 457 355 L 456 355 L 455 354 L 454 354 L 453 353 L 452 353 L 451 352 L 448 351 L 446 349 L 445 349 L 444 348 L 443 348 L 442 347 L 441 347 L 440 346 L 439 346 L 438 345 L 435 344 L 433 342 L 432 342 L 431 341 L 430 341 L 429 340 L 428 340 L 427 339 L 426 339 L 425 338 L 422 337 L 420 335 L 419 335 L 418 334 L 417 334 L 416 333 L 415 333 L 414 332 L 411 331 L 409 329 L 408 329 L 407 328 L 406 328 L 405 327 L 404 327 L 403 326 L 402 326 L 401 325 L 398 324 L 396 322 L 395 322 L 394 321 L 393 321 L 392 320 L 391 320 L 390 319 L 389 319 L 388 318 L 385 317 L 383 315 L 382 315 L 381 314 L 380 314 L 379 313 L 378 313 L 377 312 L 376 312 L 375 311 L 372 310 L 371 309 L 370 306 L 366 301 L 365 298 L 363 296 L 363 295 L 359 290 L 358 287 L 354 282 L 354 281 L 352 279 L 351 279 L 350 278 L 347 277 L 345 275 L 344 275 L 343 274 L 342 274 L 340 272 L 339 272 L 338 271 L 335 270 L 333 268 L 330 267 L 328 265 L 327 265 L 326 264 L 331 259 L 332 260 L 333 260 L 335 262 L 338 263 L 340 265 L 343 266 L 345 268 L 348 269 L 350 271 L 353 272 L 355 274 L 358 274 L 359 275 L 366 275 L 367 276 L 373 276 L 374 277 L 381 277 L 382 278 L 388 278 L 389 279 L 390 279 L 392 281 L 393 281 L 396 284 L 397 284 L 399 286 L 400 286 L 402 288 L 403 288 L 405 290 L 406 290 L 408 292 L 409 292 L 411 294 L 412 294 L 414 296 L 415 296 L 418 299 L 419 299 L 421 301 L 422 301 L 424 303 L 425 303 L 427 305 L 428 305 L 430 307 L 431 307 L 433 309 L 434 309 L 436 311 L 437 311 L 440 314 L 441 314 L 443 316 L 444 316 L 446 318 L 447 318 L 449 320 L 450 320 L 452 322 L 453 322 L 455 324 L 456 324 L 458 326 L 459 326 L 462 329 L 463 329 L 465 331 L 466 331 L 468 333 L 469 333 L 471 335 L 472 335 L 474 337 L 475 337 L 477 339 L 478 339 L 480 341 L 481 341 L 483 343 L 484 343 L 487 346 L 488 346 L 490 348 L 491 348 L 493 350 L 494 350 L 496 352 L 497 352 L 502 356 L 502 355 L 505 350 L 505 349 L 503 347 L 502 347 L 500 345 L 499 345 L 496 342 L 495 342 L 493 340 L 492 340 L 489 337 L 488 337 L 486 335 L 485 335 L 482 332 L 481 332 L 479 330 L 478 330 L 475 327 L 474 327 L 472 325 L 471 325 L 468 322 L 467 322 L 465 320 L 464 320 L 461 317 L 460 317 L 458 315 L 457 315 L 454 312 L 453 312 L 451 310 L 450 310 L 447 307 L 446 307 L 444 305 L 443 305 L 440 302 L 439 302 L 437 300 L 436 300 L 433 297 L 432 297 L 430 295 L 429 295 L 426 292 L 425 292 L 423 290 L 422 290 L 419 287 L 418 287 L 416 285 L 415 285 L 412 282 L 411 282 L 409 280 L 408 280 L 405 277 L 404 277 L 402 275 L 401 275 L 398 272 L 397 272 L 392 268 L 392 267 L 391 266 L 391 265 L 390 264 L 390 263 L 387 258 L 387 256 L 386 255 L 386 254 L 385 253 L 385 252 L 382 247 L 382 245 L 381 244 L 381 243 L 380 242 L 380 241 L 379 240 L 378 237 L 377 236 L 376 236 L 372 232 L 371 232 L 368 229 L 368 228 L 370 226 L 371 226 L 374 223 L 375 224 L 376 224 L 380 228 L 381 228 L 382 229 L 385 229 L 386 230 L 388 230 L 389 231 L 392 231 L 393 232 L 396 232 L 397 233 L 400 233 L 401 234 L 403 234 L 404 235 L 407 235 L 408 236 L 411 236 L 412 237 L 413 237 L 417 241 L 418 241 L 427 250 L 428 250 L 436 258 L 437 258 L 446 267 L 447 267 L 455 275 L 456 275 L 464 283 L 465 283 L 474 292 L 475 292 L 483 300 L 484 300 L 492 308 L 493 308 L 502 317 L 503 317 L 511 325 L 512 325 L 516 329 L 516 328 L 519 323 L 519 322 L 516 319 L 515 319 L 499 303 L 498 303 L 483 288 L 482 288 L 466 272 L 465 272 L 450 257 L 449 257 L 433 241 L 432 241 L 417 226 L 417 223 L 416 222 L 416 220 L 415 219 L 415 217 L 414 216 L 414 214 L 413 213 L 413 210 L 412 209 L 412 207 L 411 206 L 411 204 L 410 203 L 410 201 L 409 200 L 409 198 L 411 196 L 412 196 L 414 194 L 415 194 L 410 189 L 407 192 L 405 192 L 404 191 L 404 190 L 395 181 L 398 178 L 399 178 L 391 170 L 390 170 L 388 168 L 386 170 L 384 170 L 380 166 L 380 165 L 357 142 L 357 141 L 334 118 L 334 117 L 310 93 L 310 92 L 304 86 L 302 86 L 301 85 L 297 85 L 296 84 L 292 84 L 291 83 L 286 83 L 285 82 L 281 82 L 280 81 L 276 81 L 275 80 L 270 80 L 269 79 L 265 79 L 264 78 L 260 78 L 259 77 L 255 77 L 254 76 L 249 76 L 248 75 L 244 75 Z" />
        <path d="M 307 252 L 311 248 L 313 248 L 315 250 L 318 251 L 320 253 L 321 253 L 322 254 L 323 254 L 325 256 L 328 257 L 329 258 L 329 259 L 325 263 L 323 263 L 321 261 L 318 260 L 316 258 L 315 258 L 314 257 L 311 256 L 309 254 L 308 254 L 307 253 Z" />
        <path d="M 355 209 L 357 209 L 360 212 L 361 212 L 365 216 L 366 216 L 370 220 L 370 221 L 368 223 L 367 223 L 364 226 L 363 225 L 362 225 L 358 221 L 357 221 L 354 218 L 353 218 L 351 212 L 352 212 Z" />
      </g>
    </svg>
  );
}
