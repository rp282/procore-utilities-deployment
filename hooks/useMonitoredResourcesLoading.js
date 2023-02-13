import { useEffect, useState } from 'react'

function useMonitoredResourcesLoading(project_ids) {
    const [isLoading, setIsLoading] = useState(false)
    const [monitoredResources, setMonitoredResources] = useState([])

    useEffect(() => {
        
    }, [project_ids])
}

export default useMonitoredResourcesLoading