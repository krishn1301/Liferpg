import { Screen, EmptyState } from '../components/ui'

/**
 * Screens that land in Phase 2. Real routes with honest labelling beats hiding
 * the tabs — a tester who taps Stats should learn it's coming, not wonder if
 * the app is broken.
 */
export default function Placeholder({ title, note }) {
  return (
    <Screen title={title}>
      <EmptyState title="Coming soon" hint={note} />
    </Screen>
  )
}
