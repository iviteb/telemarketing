import { compose, path } from 'ramda'
import React, { useState } from 'react'
import { graphql } from 'react-apollo'
import { withSession } from 'vtex.render-runtime'
import { Queries } from 'vtex.store-resources'

import Telemarketing from './components/Telemarketing'
import { presets, useMedia } from './hooks/useMedia'
import depersonifyMutation from './mutations/depersonify.gql'
import impersonateMutation from './mutations/impersonate.gql'
import processSession from './utils/processSession'

interface Props {
  /** Query with the session */
  session: Session
  /** Mutation to depersonify */
  depersonify: () => Promise<void>
  /** Mutation to impersonate a customer */
  impersonate: (s: {}) => Promise<void>
}

const TelemarketingContainer = (props: Props) => {
  const [emailInput, setEmailInput] = useState<string>('')
  const [loadingImpersonate, setloadingImpersonate] = useState<boolean>(false)
  const mobile = useMedia(presets.mobile)

  const { session } = props
  const processedSession = processSession(session)

  const handleInputChange = (event: any) => {
    setEmailInput(event.target.value)
  }

  const handleDepersonify = () => {
    const { depersonify, session } = props
    setloadingImpersonate(true)
    depersonify()
      .then(response => {
        const depersonifyData = path(['data', 'depersonify'], response)
        !!depersonifyData && session.refetch()
        setloadingImpersonate(false)
        setEmailInput('')
      })
      .catch(() => setloadingImpersonate(false))
  }

  const handleSetSession = (email: string) => {
    const { impersonate, session } = props
    setloadingImpersonate(true)
    const variables = { email }
    impersonate({ variables })
      .then(response => {
        const profile = path(
          ['data', 'impersonate', 'impersonate', 'profile'],
          response
        )
        !!profile && session.refetch()
        setloadingImpersonate(false)
      })
      .catch(() => setloadingImpersonate(false))
  }

  if (processedSession) {
    const { client, canImpersonate, attendantEmail } = processedSession
    return canImpersonate ? (
      <Telemarketing
        client={client}
        loading={loadingImpersonate}
        emailInput={emailInput}
        attendantEmail={attendantEmail}
        onSetSession={handleSetSession}
        onDepersonify={handleDepersonify}
        onInputChange={handleInputChange}
        mobile={mobile}
      />
    ) : null
  }

  return null
}

const options = {
  name: 'session',
  options: () => ({
    ssr: false,
  }),
}

export default withSession({ loading: React.Fragment })(
  compose(
    graphql(Queries.session, options),
    graphql(depersonifyMutation, { name: 'depersonify' }),
    graphql(impersonateMutation, { name: 'impersonate' })
  )(TelemarketingContainer as any)
)
