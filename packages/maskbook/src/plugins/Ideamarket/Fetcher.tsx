import { useListingData } from './ApiFetcher'
import LogoButton from './UI/LogoButton'

interface FetcherProps {
    username: string
}

export default function Fetcher(props: FetcherProps) {
    const response = useListingData(props.username)

    if (response.isLoading) return <LogoButton found={false} username={props.username} />

    if (!response.found) return <LogoButton found={false} username={props.username} />

    return (
        <LogoButton
            found={true}
            username={props.username}
            rank={response.rank}
            dayChange={response.dayChange.toString()}
            price={response.price.toString()}
        />
    )
}
