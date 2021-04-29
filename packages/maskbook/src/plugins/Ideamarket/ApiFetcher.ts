import { useState, useEffect, Dispatch, SetStateAction } from 'react'
import { request, gql } from 'graphql-request'
import { SUBGRAPH_URI } from './constants'

const timeoutBetweenRequests = 1000
let latestRequestID = 0
let requestedListings: {
    [requestID: number]: {
        user: string
        listingData: ListingData
        setListingData: Dispatch<SetStateAction<ListingData>>
        isCancelled: boolean
    }
} = {}

export type ListingData = {
    isLoading: boolean
    found: boolean
    rank: number
    dayChange: number
    price: number
}

export function useListingData(user: string) {
    const requestID = latestRequestID++

    const [data, setData] = useState({
        isLoading: true,
        found: false,
        rank: 0,
        dayChange: 0,
        price: 0,
    } as ListingData)

    useEffect(() => {
        const lc = user.toLowerCase()

        requestedListings[requestID] = { user: lc, listingData: data, setListingData: setData, isCancelled: false }

        return () => {
            if (requestedListings[requestID]) {
                requestedListings[requestID].isCancelled = true
            }
        }
    }, [user])

    return data
}

async function run() {
    if (Object.keys(requestedListings).length === 0) {
        setTimeout(run, timeoutBetweenRequests)
        return
    }

    const fetchListings = requestedListings
    requestedListings = {}

    const users = [...new Set(Object.values(fetchListings).map((v) => v.user))]
    const query = createBatchQuery(users)
    const results = await runQuery(query)

    Object.keys(fetchListings).forEach((requestID: any) => {
        const { user, setListingData } = fetchListings[requestID]
        const listingResult = results.find((r: any) => r.name === user)

        if (fetchListings[requestID].isCancelled) {
            return
        }

        if (listingResult) {
            setListingData({
                isLoading: false,
                found: true,
                rank: listingResult.rank,
                dayChange: listingResult.dayChange,
                price: listingResult.latestPricePoint.price,
            } as ListingData)
        } else {
            setListingData({
                isLoading: false,
                found: false,
            } as ListingData)
        }
    })

    setTimeout(run, timeoutBetweenRequests)
}

async function runQuery(query: string) {
    try {
        const result = await request(SUBGRAPH_URI, query)
        if (!result || !result.ideaTokens) {
            throw new Error()
        }

        return result.ideaTokens
    } catch (ex) {
        return []
    }
}

function createBatchQuery(users: string[]) {
    const query = gql`
    {
        ideaTokens(where: { name_in: [${users.map((u) => `"${u}"`).join(',')}] }) {
            name
            rank
            dayChange
	        latestPricePoint {
	            price
	        }
        }
    }`
    return query
}

run()
