#[macro_export]
macro_rules! controller_seeds {
    ($controller:expr) => {
        &[
            &$controller.unique_seed.to_le_bytes(),
            b"AssetAccessController".as_ref(),
            &[$controller.bump],
        ]
    };
}
