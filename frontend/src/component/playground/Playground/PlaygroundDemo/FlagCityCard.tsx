import { useEffect, useRef } from 'react';
import { styled } from '@mui/material';
import { formatApiPath } from 'utils/formatPath';
import type { IFlagCityCityHints } from './useFlagCityHints.ts';
import { Sim } from './flagcity/sim.js';
import { Renderer } from './flagcity/renderer.js';
import { buildCityCard } from './flagcity/ui.js';
import { SoundFX } from './flagcity/audio.js';
import { createCityFlags } from './flagcity/flags.js';
import { bindFlagsToSim } from './flagcity/bindings.js';
import screamUrl from './flagcity/assets/wilhelm.mp3';
import './flagcity/flagcity.css';

const StyledCityCardRoot = styled('section')({
    width: '100%',
    // the sample's .city-card sets flex: 1 1 0 for its horizontal layout;
    // inside our column flexbox a zero basis collapses the card
    flex: 'none',
});

interface IFlagCityCardProps {
    environmentName: string;
    tokenSecret: string;
    hints?: IFlagCityCityHints;
}

/**
 * Mounts one Flag City simulation (ported from the flag-city sample) into a
 * React-owned container. The card's inner DOM is built by the sample's own
 * buildCityCard and treated as a write-only island; React only manages the
 * root element and the lifecycle.
 */
export const FlagCityCard = ({
    environmentName,
    tokenSecret,
    hints,
}: IFlagCityCardProps) => {
    const rootRef = useRef<HTMLElement>(null);
    const hintsRef = useRef(hints);
    const cityRef = useRef<{ flags: any; rebind: () => void } | undefined>(
        undefined,
    );

    // strategy hints (rollout %, beeping target, forced color) arrive from
    // the admin API; re-bind the running sim whenever they change
    useEffect(() => {
        hintsRef.current = hints;
        const city = cityRef.current;
        if (city) {
            city.flags.hints = hints ?? null;
            city.rebind();
        }
    }, [hints]);

    useEffect(() => {
        const root = rootRef.current;
        if (!root) return;

        // untyped sample code: hints is a mutable extension point
        const flags: any = createCityFlags({
            url: new URL(
                formatApiPath('api/frontend'),
                window.location.origin,
            ).toString(),
            clientKey: tokenSecret,
            environmentName,
        });
        const sound = new SoundFX(screamUrl);
        // the sim is untyped sample code; callbacks are initialized to null
        const sim: any = new Sim();
        sim.callbacks.onDeath = () => {
            if (sim.config.sound) sound.playScream();
        };
        sim.callbacks.onBeep = () => {
            if (sim.config.sound) sound.beep();
        };

        const card = buildCityCard(root, sim, {
            name: environmentName,
            live: true,
        });
        const renderer = new Renderer(card.canvas);
        const rebind = () => {
            bindFlagsToSim(flags, sim);
            card.refresh();
        };
        flags.hints = hintsRef.current ?? null;
        cityRef.current = { flags, rebind };
        rebind();
        flags.onUpdate(rebind);

        const observer = new ResizeObserver(() => renderer.resize());
        observer.observe(root);

        // fixed 60 Hz logic step with an accumulator, render once per frame
        // (same loop as the sample's main.js, but per card and cancellable)
        const STEP = 1 / 60;
        let acc = 0;
        let last = performance.now();
        let raf = requestAnimationFrame(function frame(now) {
            acc += Math.min((now - last) / 1000, 0.25);
            last = now;
            while (acc >= STEP) {
                sim.update(STEP);
                acc -= STEP;
            }
            renderer.draw(sim);
            raf = requestAnimationFrame(frame);
        });

        return () => {
            cancelAnimationFrame(raf);
            observer.disconnect();
            flags.stop();
            cityRef.current = undefined;
            root.innerHTML = '';
        };
    }, [environmentName, tokenSecret]);

    return (
        <StyledCityCardRoot
            className='city-card'
            ref={rootRef}
            data-testid={`flag-city-${environmentName}`}
        />
    );
};
